/*
 * EventFlow — временное хранилище изолированных демосессий.
 * Только оперативная память SharedWorker. Никаких запросов к Supabase
 * и никаких записей в localStorage/sessionStorage.
 */

const sessions = new Map();

function getSession(contextId) {
  if (!sessions.has(contextId)) {
    sessions.set(contextId, {
      state: {
        note: "Демо-сессия создана. Измените этот текст в любом из двух окон.",
        revision: 0,
        updatedAt: new Date().toISOString()
      },
      ports: new Set()
    });
  }

  return sessions.get(contextId);
}

function sendState(port, contextId, state) {
  port.postMessage({
    type: "state",
    contextId,
    state
  });
}

onconnect = (event) => {
  const port = event.ports[0];
  let connectedContextId = null;

  port.onmessage = (messageEvent) => {
    const message = messageEvent.data || {};

    if (message.type === "init") {
      const contextId = String(message.contextId || "");
      if (!/^[a-f0-9-]{16,64}$/i.test(contextId)) {
        port.postMessage({ type: "error", message: "Некорректный идентификатор демосессии." });
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

    if (message.type === "set-note") {
      if (!connectedContextId) return;

      const session = sessions.get(connectedContextId);
      if (!session) return;

      const note = String(message.note ?? "").slice(0, 500);
      session.state = {
        note,
        revision: session.state.revision + 1,
        updatedAt: new Date().toISOString()
      };

      for (const clientPort of session.ports) {
        try {
          sendState(clientPort, connectedContextId, session.state);
        } catch (error) {
          session.ports.delete(clientPort);
        }
      }
      return;
    }

    if (message.type === "disconnect") {
      if (!connectedContextId) return;

      const session = sessions.get(connectedContextId);
      if (session) {
        session.ports.delete(port);
        if (session.ports.size === 0) sessions.delete(connectedContextId);
      }
      connectedContextId = null;
      port.close();
    }
  };

  port.start();
};
