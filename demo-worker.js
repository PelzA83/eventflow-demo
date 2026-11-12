/*
 * EventFlow — временное хранилище изолированных демосессий.
 * Данные живут только в оперативной памяти SharedWorker.
 * Никаких запросов к Supabase, localStorage или sessionStorage.
 */

const sessions = new Map();

const BLOCK_KEYS = [
  "greeting",
  "invitation_text",
  "couple_signature",
  "event_info",
  "dress_code",
  "menu",
  "rsvp",
  "seating",
  "qr_code"
];

function createInitialState() {
  const now = new Date().toISOString();

  return {
    schema_version: 1,
    revision: 0,
    updatedAt: now,

    // Служебное поле сохраняет работоспособность текущей тестовой страницы.
    note: "Демо-сессия создана. Измените этот текст в любом из двух окон.",

    event: {
      id: "demo-event",
      title: "Свадьба Александра и Марии",
      date: "2027-06-12",
      event_date: "2027-06-12",
      event_time: "16:00:00",
      timezone: "Europe/Moscow",
      venue_name: "",
      venue_address: "",
      rsvp_deadline: "2027-05-29",
      status: "active"
    },

    group: {
      id: "demo-group",
      name: "Семья Ивановых",
      greeting_style: "informal"
    },

    guests: [
      {
        id: "demo-guest-alexander",
        first_name: "Александр",
        last_name: "Иванов",
        patronymic: "Иванович",
        salutation_type: "male",
        role: "guest",
        group_name: "Семья Ивановых",
        rsvp_status: "pending",
        attendance: null,
        comment: "",
        responded_at: null
      },
      {
        id: "demo-guest-maria",
        first_name: "Мария",
        last_name: "Иванова",
        patronymic: "Петровна",
        salutation_type: "female",
        role: "guest",
        group_name: "Семья Ивановых",
        rsvp_status: "pending",
        attendance: null,
        comment: "",
        responded_at: null
      },
      {
        id: "demo-guest-maxim",
        first_name: "Максим",
        last_name: "Иванов",
        patronymic: "",
        salutation_type: "none",
        role: "guest",
        group_name: "Семья Ивановых",
        rsvp_status: "pending",
        attendance: null,
        comment: "",
        responded_at: null
      }
    ],

    blocks: BLOCK_KEYS.map((block_key, index) => ({
      id: "demo-block-" + block_key,
      block_key,
      is_visible: !["dress_code", "menu", "seating"].includes(block_key),
      sort_order: index + 1,
      content: { schema_version: 1, data: {} },
      settings: { schema_version: 1, data: {} }
    })),

    rsvp: {
      comment: ""
    }
  };
}

function getSession(contextId) {
  if (!sessions.has(contextId)) {
    sessions.set(contextId, {
      state: createInitialState(),
      ports: new Set()
    });
  }

  return sessions.get(contextId);
}

function sendState(port, contextId, state) {
  port.postMessage({ type: "state", contextId, state });
}

function broadcastState(contextId, session) {
  session.state.revision += 1;
  session.state.updatedAt = new Date().toISOString();

  for (const clientPort of session.ports) {
    try {
      sendState(clientPort, contextId, session.state);
    } catch (error) {
      session.ports.delete(clientPort);
    }
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function updateEvent(session, fields) {
  if (!isPlainObject(fields)) return false;

  const allowed = [
    "title",
    "date",
    "event_date",
    "event_time",
    "timezone",
    "venue_name",
    "venue_address",
    "rsvp_deadline",
    "status"
  ];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      session.state.event[key] = String(fields[key] ?? "");
    }
  }

  return true;
}

function updateBlock(session, blockKey, patch) {
  if (!BLOCK_KEYS.includes(blockKey) || !isPlainObject(patch)) return false;

  const block = session.state.blocks.find(item => item.block_key === blockKey);
  if (!block) return false;

  if (typeof patch.is_visible === "boolean") {
    block.is_visible = patch.is_visible;
  }

  if (Number.isFinite(Number(patch.sort_order))) {
    block.sort_order = Number(patch.sort_order);
  }

  for (const part of ["content", "settings"]) {
    if (isPlainObject(patch[part])) {
      block[part] = {
        schema_version: Number(patch[part].schema_version) || 1,
        data: isPlainObject(patch[part].data) ? patch[part].data : {}
      };
    }
  }

  return true;
}

function updateGuest(session, guestId, patch) {
  if (!isPlainObject(patch)) return false;

  const guest = session.state.guests.find(item => item.id === guestId);
  if (!guest) return false;

  const allowed = [
    "first_name",
    "last_name",
    "patronymic",
    "salutation_type",
    "role",
    "group_name"
  ];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      guest[key] = String(patch[key] ?? "");
    }
  }

  return true;
}

function submitRsvp(session, responses, comment) {
  if (!Array.isArray(responses)) return false;

  const allowedAttendance = ["yes", "no", "pending"];

  for (const response of responses) {
    if (!isPlainObject(response)) continue;

    const guest = session.state.guests.find(item => item.id === response.guest_id);
    if (!guest || !allowedAttendance.includes(response.attendance)) continue;

    guest.attendance = response.attendance === "pending"
      ? null
      : response.attendance;
    guest.rsvp_status = response.attendance === "yes"
      ? "confirmed"
      : response.attendance === "no"
        ? "declined"
        : "pending";
    guest.responded_at = response.attendance === "pending"
      ? null
      : new Date().toISOString();
  }

  if (typeof comment === "string") {
    session.state.rsvp.comment = comment.slice(0, 2000);
  }

  return true;
}

function applyMessage(session, message) {
  switch (message.type) {
    case "set-note":
      session.state.note = String(message.note ?? "").slice(0, 500);
      return true;

    case "update-event":
      return updateEvent(session, message.fields);

    case "update-block":
      return updateBlock(session, String(message.blockKey || ""), message.patch);

    case "update-guest":
      return updateGuest(session, String(message.guestId || ""), message.patch);

    case "submit-rsvp":
      return submitRsvp(session, message.responses, message.comment);

    default:
      return false;
  }
}

onconnect = (event) => {
  const port = event.ports[0];
  let connectedContextId = null;

  port.onmessage = (messageEvent) => {
    const message = messageEvent.data || {};

    if (message.type === "init") {
      const contextId = String(message.contextId || "");
      if (!/^[a-f0-9-]{16,64}$/i.test(contextId)) {
        port.postMessage({
          type: "error",
          message: "Некорректный идентификатор демосессии."
        });
        return;
      }

      if (connectedContextId) {
        const previous = sessions.get(connectedContextId);
        if (previous) previous.ports.delete(port);
      }

      connectedContextId = contextId;
      const session = getSession(contextId);
      session.ports.add(port);
      sendState(port, contextId, session.state);
      return;
    }

    if (message.type === "disconnect") {
      if (connectedContextId) {
        const session = sessions.get(connectedContextId);
        if (session) {
          session.ports.delete(port);
          if (session.ports.size === 0) sessions.delete(connectedContextId);
        }
      }

      connectedContextId = null;
      port.close();
      return;
    }

    if (!connectedContextId) return;

    const session = sessions.get(connectedContextId);
    if (!session) return;

    if (applyMessage(session, message)) {
      broadcastState(connectedContextId, session);
    }
  };

  port.start();
};
