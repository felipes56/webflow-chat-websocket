/**
 * chat.js
 * Cliente Web (SPA) para el chat colaborativo.
 *
 * - Usa WebSocket nativo para conectarse al servidor (server/server.js)
 * - Maneja:
 *   - envío y recepción de mensajes
 *   - lista de usuarios conectados (presencia)
 *   - mensajes de sistema: usuarios que entran / salen / cambian nombre
 */

// Para pruebas locales en tu PC:
// const WS_URL = "ws://localhost:3000";

// Para producción global (Render):
const WS_URL = "wss://webflow-chat-websocket.onrender.com";

// Elementos del DOM
const messagesEl = document.getElementById("messages");
const usersListEl = document.getElementById("usersList");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const currentUsernameEl = document.getElementById("currentUsername");
const changeNameBtn = document.getElementById("changeNameBtn");

const connectedCountEl = document.getElementById("connectedCount");
const lastLeftUserEl = document.getElementById("lastLeftUser");

let socket = null;
let username = null;

// === INICIO ===
init();

function init() {
  username = getStoredUsername() || askForUsername();
  storeUsername(username);
  renderCurrentUsername();

  setupWebSocket();
  setupEvents();
}

/**
 * Configura la conexión WebSocket con el servidor.
 */
function setupWebSocket() {
  addSystemMessage("Conectando con el servidor de chat...");

  socket = new WebSocket(WS_URL);

  socket.addEventListener("open", () => {
    addSystemMessage(`Conectado al servidor WebSocket`);

    // Enviar mensaje de unión con el nombre actual
    sendMessage({
      type: "join",
      name: username,
    });
  });

  socket.addEventListener("message", (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.error("Mensaje inválido del servidor:", event.data);
      return;
    }

    handleServerMessage(data);
  });

  socket.addEventListener("close", () => {
    addSystemMessage("Conexión cerrada. Refresca la página para reconectar.");
  });

  socket.addEventListener("error", (err) => {
    console.error("Error WebSocket:", err);
    addSystemMessage("Error en la conexión WebSocket.");
  });
}

/**
 * Maneja los diferentes tipos de mensajes que envía el servidor.
 */
function handleServerMessage(msg) {
  if (msg.type === "welcome") {
    // El servidor nos confirma el nombre final
    if (msg.selfName) {
      username = msg.selfName;
      storeUsername(username);
      renderCurrentUsername();
    }
    return;
  }

  if (msg.type === "system") {
    addSystemMessage(msg.text, msg.timestamp);
    return;
  }

  if (msg.type === "chat") {
    const isOwn = msg.user === username;
    addChatMessage(msg.user || "Usuario", msg.text, msg.timestamp, isOwn);
    return;
  }

  if (msg.type === "presence") {
    renderUsersList(msg.users || []);
    return;
  }
}

/**
 * Enviar un mensaje al servidor (si la conexión está abierta).
 */
function sendMessage(obj) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(obj));
}

/**
 * Eventos de formulario y botón "Cambiar nombre".
 */
function setupEvents() {
  messageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    sendMessage({
      type: "chat",
      text,
    });

    messageInput.value = "";
    messageInput.focus();
  });

  changeNameBtn.addEventListener("click", () => {
    const oldName = username;
    const newName = askForUsername(oldName);

    if (!newName || newName === oldName) return;

    username = newName;
    storeUsername(username);
    renderCurrentUsername();

    sendMessage({
      type: "rename",
      newName,
    });
  });
}

// === MANEJO DE USUARIOS LOCAL (nombre guardado) ===

function getStoredUsername() {
  try {
    return localStorage.getItem("webflow_chat_username");
  } catch {
    return null;
  }
}

function storeUsername(name) {
  try {
    localStorage.setItem("webflow_chat_username", name);
  } catch {
    // ignorar
  }
}

function askForUsername(previous) {
  let name = prompt("Ingresa un nombre para el chat:", previous || "");
  if (!name) {
    const random = Math.floor(Math.random() * 900) + 100;
    name = "Usuario_" + random;
  }
  return name.trim();
}

function renderCurrentUsername() {
  if (currentUsernameEl) currentUsernameEl.textContent = username;
}

// === PRESENCIA: LISTA DE USUARIOS ===

function renderUsersList(usernames) {
  usersListEl.innerHTML = "";

  if (connectedCountEl) {
    connectedCountEl.textContent = usernames.length.toString();
  }

  if (!usernames.length) {
    const li = document.createElement("li");
    li.textContent = "No hay usuarios conectados todavía.";
    usersListEl.appendChild(li);
    return;
  }

  usernames.forEach((name) => {
    const li = document.createElement("li");

    const dot = document.createElement("span");
    dot.className = "user-dot";

    const text = document.createElement("span");
    text.className = "user-name";
    text.textContent = name;

    const tag = document.createElement("span");
    tag.className = "user-tag";
    tag.textContent = name === username ? "Tú" : "Online";

    if (name === username) {
      li.classList.add("me");
    }

    li.appendChild(dot);
    li.appendChild(text);
    li.appendChild(tag);
    usersListEl.appendChild(li);
  });
}

// === MENSAJES EN LA INTERFAZ ===

function addChatMessage(user, text, isoTime, isOwn) {
  const row = document.createElement("div");
  row.className = "message-row" + (isOwn ? " own" : "");

  const meta = document.createElement("div");
  meta.className = "message-meta";

  const usernameSpan = document.createElement("span");
  usernameSpan.className = "username";
  usernameSpan.textContent = user;

  const timeSpan = document.createElement("span");
  timeSpan.className = "message-time";
  timeSpan.textContent = formatTime(isoTime);

  meta.appendChild(usernameSpan);
  meta.appendChild(timeSpan);

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;

  row.appendChild(meta);
  row.appendChild(bubble);

  messagesEl.appendChild(row);
  scrollMessagesToBottom();
}

function addSystemMessage(text, isoTime) {
  const el = document.createElement("div");
  el.className = "system-message";

  const time = formatTime(isoTime);
  el.textContent = time ? `[${time}] ${text}` : text;

  // Actualizar "último en salir" si aplica
  if (text.includes("se ha desconectado") && lastLeftUserEl) {
    const name = text.replace(" se ha desconectado", "");
    lastLeftUserEl.textContent = name;
  }

  messagesEl.appendChild(el);
  scrollMessagesToBottom();
}

function scrollMessagesToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// === UTILIDADES ===

function formatTime(iso) {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    const h = pad2(date.getHours());
    const m = pad2(date.getMinutes());
    return `${h}:${m}`;
  } catch {
    return "";
  }
}

function pad2(num) {
  return num.toString().padStart(2, "0");
}