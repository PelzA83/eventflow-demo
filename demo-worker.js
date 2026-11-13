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
  "gifts_wishes",
  "getting_there",
  "rsvp",
  "seating",
  "qr_code"
];

function createInitialState(productType = "corporate") {
  const now = new Date().toISOString();
  const isWedding = productType === "wedding";

  const state = {
    schema_version: 2,
    revision: 0,
    updatedAt: now,

    // Служебное поле сохраняет работоспособность текущей тестовой страницы.
    note: "Новогодняя демосессия создана.",

    event: {
      id: "demo-event",
      title: isWedding ? "Свадебное торжество" : "Новогодний вечер",
      date: isWedding ? "2027-06-19" : "2026-12-18",
      event_date: isWedding ? "2027-06-19" : "2026-12-18",
      event_time: "18:00",
      timezone: "Asia/Yekaterinburg",
      venue_name: "Загородная площадка",
      venue_address: "Екатеринбург и пригород · точный адрес уточняется",
      rsvp_deadline: "",
      status: "active"
    },

    group: {
      id: "demo-group",
      name: isWedding ? "Гости свадьбы" : "Гости новогоднего вечера",
      greeting_style: "respectful"
    },

    invitations: [],
    guests: [],

    blocks: BLOCK_KEYS.map((block_key, index) => {
      const contentByBlock = {
        greeting: {},
        invitation_text: {
          title: isWedding ? "Приглашаем разделить с нами этот день" : "Приглашаем на новогодний вечер",
          paragraphs: isWedding
            ? [
                "Будем счастливы разделить один из самых важных дней нашей жизни с вами.",
                "Пусть этот день станет тёплым воспоминанием, к которому мы будем возвращаться вместе."
              ]
            : [
                "Будем рады встретить Новый год вместе с вами!",
                "Сохраните этот вечер для тёплой встречи, праздничного настроения и добрых пожеланий."
              ]
        },
        event_info: {
          title: "Когда и где встречаемся",
          items: [
            { type: "date", label: "" },
            { type: "time", label: "Начало в" },
            { type: "venue", label: "Место проведения" },
            { type: "address", label: "Адрес" }
          ]
        },
        couple_signature: {
          text: isWedding ? "С любовью," : "До встречи на празднике!",
          subtitle: isWedding ? "Александр & Мария" : "Команда организаторов"
        },
        dress_code: {
          title: "Дресс-код",
          description: "Праздничный образ, в котором вам будет комфортно провести этот день. Будем рады видеть вас в мягкой, гармоничной палитре.",
          items: ["Молочные и сливочные оттенки", "Песочный, бежевый и мягкий серый", "Небольшие акценты в природных тонах"]
        },
        menu: {
          title: "Праздничное меню",
          description: "В течение вечера вас ждут любимые вкусы, сезонные продукты и угощения для хорошего настроения.",
          sections: [
            { title: "Лёгкие закуски", items: [{ name: "Сезонные овощи и зелень" }, { name: "Сыры и небольшие закуски" }] },
            { title: "Горячее", items: [{ name: "Основное блюдо на выбор" }, { name: "Гарнир и сезонные дополнения" }] },
            { title: "Десерты", items: [{ name: "Праздничный торт" }, { name: "Фрукты и сладости" }] }
          ]
        },
        gifts_wishes: {
          title: "Подарки и пожелания",
          intro: "Самое главное для нас — разделить этот день с вами. Если вы захотите сделать нам подарок, будем благодарны за внимание к нашим небольшим пожеланиям.",
          notes: [
            { label: "О подарках", text: "Будем рады вкладу в наше общее семейное путешествие. Конверт станет самым удобным способом поздравить нас." },
            { label: "Ваши пожелания", text: "Оставьте добрые слова и пожелания — мы с удовольствием сохраним их на память об этом дне." }
          ]
        },
        getting_there: {
          title: "Как добраться",
          description: "Подсказки для планирования дороги к месту проведения мероприятия.",
          routes: [
            { label: "На автомобиле или такси", text: "Заранее уточните условия парковки рядом с площадкой." },
            { label: "Общественный транспорт", text: "Проверьте актуальный маршрут и расписание перед выездом." },
            { label: "На входе", text: "При необходимости обратитесь к организаторам за помощью." }
          ]
        },
        rsvp: {},
        seating: {
          title: "Ваше место на празднике",
          description: "Найдите свой стол на общей схеме зала — персональное место указано выше."
        },
        qr_code: {}
      };

      const isVisible = isWedding
        ? [
            "greeting", "invitation_text", "event_info",
            "dress_code", "menu", "getting_there", "rsvp", "qr_code",
            "gifts_wishes", "seating"
          ].includes(block_key)
        : [
            "greeting", "invitation_text", "event_info",
            "couple_signature", "rsvp"
          ].includes(block_key);

      const settingsByBlock = block_key === "greeting"
        ? { personalization: "real" }
        : {};

      return {
        id: "demo-block-" + block_key,
        block_key,
        is_visible: isVisible,
        sort_order: index + 1,
        content: {
          schema_version: 1,
          data: contentByBlock[block_key] || {}
        },
        settings: {
          schema_version: 1,
          data: settingsByBlock
        }
      };
    }),

    rsvp: {
      comment: ""
    }
  };

  // Небольшой демонстрационный набор позволяет сразу показать гостевой
  // сценарий и кабинет организатора без предварительного ручного заполнения.
  const sampleInvitation = createInvitation(state, {
    internal_name: "Семья Ивановых"
  });
  state.guests.push(
    {
      id: createRecordId("guest"),
      invitation_id: sampleInvitation.id,
      participant_status: "active",
      excluded_at: null,
      first_name: "Александр",
      last_name: "Иванов",
      patronymic: "Сергеевич",
      salutation_type: "male",
      greeting_style: "respectful",
      role: "guest",
      group_name: state.group.name,
      attendance: null,
      rsvp_status: "pending",
      responded_at: null
    },
    {
      id: createRecordId("guest"),
      invitation_id: sampleInvitation.id,
      participant_status: "active",
      excluded_at: null,
      first_name: "Мария",
      last_name: "Иванова",
      patronymic: "Андреевна",
      salutation_type: "female",
      greeting_style: "respectful",
      role: "guest",
      group_name: state.group.name,
      attendance: null,
      rsvp_status: "pending",
      responded_at: null
    }
  );

  return state;
}

function createRecordId(prefix) {
  const value = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);

  return prefix + "-" + value;
}

function createInvitation(state, fields = {}) {
  const now = new Date().toISOString();
  const invitation = {
    id: createRecordId("inv"),
    internal_name: String(fields.internal_name || "").trim(),
    status: "active",
    qr_revision: 0,
    created_at: now,
    updated_at: now
  };

  state.invitations.push(invitation);
  return invitation;
}

// Совместимость со старой структурой: каждый прежний гость получает
// отдельное приглашение. Текстовый group_name не объединяет записи.
function ensureInvitationStructure(state) {
  if (!Array.isArray(state.invitations)) state.invitations = [];
  if (!Array.isArray(state.guests)) state.guests = [];

  for (const guest of state.guests) {
    const linkedInvitation = state.invitations.find(
      invitation => invitation.id === guest.invitation_id
    );

    if (!linkedInvitation) {
      const invitation = createInvitation(state);
      guest.invitation_id = invitation.id;
    }

    if (!["active", "excluded"].includes(guest.participant_status)) {
      guest.participant_status = "active";
    }

    if (!Object.prototype.hasOwnProperty.call(guest, "excluded_at")) {
      guest.excluded_at = null;
    }
  }

  return state;
}

function getSession(contextId, productType = "corporate") {
  if (!sessions.has(contextId)) {
    const state = ensureInvitationStructure(createInitialState(productType));
    sessions.set(contextId, {
      state,
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

function addGuest(session, fields) {
  if (!isPlainObject(fields)) return false;

  const firstName = String(fields.first_name || "").trim();
  const lastName = String(fields.last_name || "").trim();
  const patronymic = String(fields.patronymic || "").trim();
  if (!firstName) return false;

  const requestedInvitationId = String(fields.invitation_id || "").trim();
  let invitation = requestedInvitationId
    ? session.state.invitations.find(item => item.id === requestedInvitationId)
    : null;

  // Без указанного invitation_id создаётся новое индивидуальное приглашение.
  // Добавление в существующее приглашение возможно только по его точному ID.
  if (requestedInvitationId && !invitation) return false;
  if (!invitation) {
    invitation = createInvitation(session.state, {
      internal_name: fields.internal_name
    });
  } else {
    invitation.updated_at = new Date().toISOString();
  }

  const guestId = createRecordId("guest");

  session.state.guests.push({
    id: guestId,
    invitation_id: invitation.id,
    participant_status: "active",
    excluded_at: null,
    first_name: firstName,
    last_name: lastName,
    patronymic,
    salutation_type: ["male", "female"].includes(fields.salutation_type)
      ? fields.salutation_type
      : "auto",
    greeting_style: fields.greeting_style === "informal" ? "informal" : "respectful",
    role: "guest",
    group_name: String(fields.group_name || session.state.group.name || "").trim(),
    attendance: null,
    rsvp_status: "pending",
    responded_at: null
  });

  return true;
}

function createInvitationWithGuests(session, fields) {
  if (!isPlainObject(fields) || !Array.isArray(fields.participants) || fields.participants.length < 1) {
    return false;
  }

  const participants = fields.participants.map(participant => {
    if (!isPlainObject(participant)) return null;
    const firstName = String(participant.first_name || "").trim();
    const lastName = String(participant.last_name || "").trim();
    if (!firstName || !lastName) return null;
    return {
      first_name: firstName,
      last_name: lastName,
      patronymic: String(participant.patronymic || "").trim(),
      salutation_type: ["male", "female"].includes(participant.salutation_type)
        ? participant.salutation_type : "auto",
      greeting_style: participant.greeting_style === "informal" ? "informal" : "respectful"
    };
  });

  // Проверяем весь набор до любых изменений состояния: создание атомарно.
  if (participants.some(participant => participant === null)) return false;

  const invitation = createInvitation(session.state, {
    internal_name: String(fields.internal_name || "").trim()
  });
  for (const participant of participants) {
    const guestId = createRecordId("guest");
    session.state.guests.push({
      id: guestId,
      invitation_id: invitation.id,
      participant_status: "active",
      excluded_at: null,
      ...participant,
      role: "guest",
      group_name: String(session.state.group?.name || "").trim(),
      attendance: null,
      rsvp_status: "pending",
      responded_at: null
    });
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
    "greeting_style",
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

function updateInvitation(session, fields) {
  if (!isPlainObject(fields)) return false;
  const invitationId = String(fields.invitation_id || "").trim();
  const invitation = session.state.invitations.find(item => item.id === invitationId);
  if (!invitation || !Array.isArray(fields.participants) || fields.participants.length < 1) return false;

  const currentMembers = session.state.guests.filter(guest =>
    guest.invitation_id === invitationId && guest.participant_status !== "excluded"
  );
  const currentById = new Map(currentMembers.map(guest => [guest.id, guest]));
  const normalized = [];
  const seenIds = new Set();

  for (const item of fields.participants) {
    if (!isPlainObject(item)) return false;
    const firstName = String(item.first_name || "").trim();
    const lastName = String(item.last_name || "").trim();
    const guestId = String(item.guest_id || "").trim();
    const readdedFromGuestId = String(item.readded_from_guest_id || "").trim();
    if (!firstName || !lastName) return false;
    if (guestId && (!currentById.has(guestId) || seenIds.has(guestId))) return false;
    if (guestId) seenIds.add(guestId);
    if (readdedFromGuestId) {
      const sourceGuest = session.state.guests.find(guest =>
        guest.id === readdedFromGuestId &&
        guest.invitation_id === invitationId &&
        guest.participant_status === "excluded"
      );
      if (!sourceGuest || guestId) return false;
    }
    normalized.push({
      guest_id: guestId,
      readded_from_guest_id: readdedFromGuestId,
      first_name: firstName,
      last_name: lastName,
      patronymic: String(item.patronymic || "").trim(),
      salutation_type: ["male", "female"].includes(item.salutation_type) ? item.salutation_type : "auto",
      greeting_style: item.greeting_style === "informal" ? "informal" : "respectful"
    });
  }

  const beforeConfirmed = currentMembers
    .filter(guest => guest.rsvp_status === "confirmed")
    .map(guest => guest.id).sort().join("|");

  // Все поля проверены до изменения состояния. Состав обновляется одной операцией.
  invitation.internal_name = String(fields.internal_name || "").trim();
  const retainedIds = new Set();

  for (const participant of normalized) {
    if (participant.guest_id) {
      const guest = currentById.get(participant.guest_id);
      Object.assign(guest, {
        first_name: participant.first_name,
        last_name: participant.last_name,
        patronymic: participant.patronymic,
        salutation_type: participant.salutation_type,
        greeting_style: participant.greeting_style
      });
      retainedIds.add(guest.id);
    } else {
      const guestId = createRecordId("guest");
      session.state.guests.push({
        id: guestId,
        invitation_id: invitationId,
        participant_status: "active",
        excluded_at: null,
        first_name: participant.first_name,
        last_name: participant.last_name,
        patronymic: participant.patronymic,
        salutation_type: participant.salutation_type,
        greeting_style: participant.greeting_style,
        ...(participant.readded_from_guest_id ? { readded_from_guest_id: participant.readded_from_guest_id } : {}),
        role: "guest",
        group_name: String(session.state.group?.name || "").trim(),
        attendance: null,
        rsvp_status: "pending",
        responded_at: null
      });
      retainedIds.add(guestId);
    }
  }

  for (const guest of currentMembers) {
    if (!retainedIds.has(guest.id)) {
      guest.participant_status = "excluded";
      guest.excluded_at = new Date().toISOString();
    }
  }

  const afterConfirmed = session.state.guests
    .filter(guest => guest.invitation_id === invitationId &&
      guest.participant_status !== "excluded" && guest.rsvp_status === "confirmed")
    .map(guest => guest.id).sort().join("|");

  if (beforeConfirmed !== afterConfirmed) invitation.qr_revision = Number(invitation.qr_revision || 0) + 1;
  invitation.updated_at = new Date().toISOString();
  return true;
}

function submitRsvp(session, responses, comment) {
  if (!Array.isArray(responses)) return false;

  const allowedAttendance = ["yes", "no", "pending"];

  // Сохраняем исходный состав подтвердивших участие отдельно по каждому
  // приглашению, чтобы повысить ревизию только при реальном изменении состава.
  const confirmedBefore = new Map();
  for (const invitation of session.state.invitations) {
    const ids = session.state.guests
      .filter(guest => guest.invitation_id === invitation.id &&
        guest.participant_status !== "excluded" &&
        guest.rsvp_status === "confirmed")
      .map(guest => guest.id)
      .sort()
      .join("|");
    confirmedBefore.set(invitation.id, ids);
  }

  for (const response of responses) {
    if (!isPlainObject(response)) continue;

    const guest = session.state.guests.find(item =>
      item.id === response.guest_id &&
      item.participant_status !== "excluded"
    );
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

  for (const invitation of session.state.invitations) {
    const before = confirmedBefore.get(invitation.id) || "";
    const after = session.state.guests
      .filter(guest => guest.invitation_id === invitation.id &&
        guest.participant_status !== "excluded" &&
        guest.rsvp_status === "confirmed")
      .map(guest => guest.id)
      .sort()
      .join("|");

    if (before !== after) {
      invitation.qr_revision = Number(invitation.qr_revision || 0) + 1;
      invitation.updated_at = new Date().toISOString();
    }
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

    case "add-guest":
      return addGuest(session, message.fields);

    case "create-invitation":
      return createInvitationWithGuests(session, message.fields);

    case "update-guest":
      return updateGuest(session, String(message.guestId || ""), message.patch);

    case "update-invitation":
      return updateInvitation(session, message.fields);

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
      const productType = message.productType === "wedding" ? "wedding" : "corporate";
      const session = getSession(contextId, productType);
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
