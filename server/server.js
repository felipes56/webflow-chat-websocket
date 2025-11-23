// server/server.js
// Servidor WebSocket sencillo para el chat colaborativo

const WebSocket = require("ws");

// Puerto del WebSocket (puedes cambiarlo si quieres)
const PORT = 3000;

const wss = new WebSocket.Server({
  port: PORT,
  host: "0.0.0.0",   // 👈 acepta conexiones desde tu red
});


let nextId = 1;

console.log(`Servidor WebSocket escuchando en ws://localhost:${PORT}`);

function broadcast(obj) {
  const data = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function getConnectedUsers() {
  return Array.from(wss.clients)
    .filter((c) => c.readyState === WebSocket.OPEN)
    .map((c) => c.user?.name || "Usuario");
}

wss.on("connection", (ws) => {
  // Asignar un nombre temporal por defecto
  const random = Math.floor(Math.random() * 900) + 100;
  ws.user = {
    id: nextId++,
    name: `Usuario_${random}`,
  };

  console.log(`Nueva conexión: ${ws.user.name}`);

  // Enviar mensaje de bienvenida solo a este cliente
  ws.send(
    JSON.stringify({
      type: "welcome",
      selfName: ws.user.name,
      timestamp: new Date().toISOString(),
    })
  );

  // Avisar a todos que alguien se conectó
  broadcast({
    type: "system",
    text: `${ws.user.name} se ha unido al chat`,
    timestamp: new Date().toISOString(),
  });

  // Enviar la lista de usuarios conectados
  broadcast({
    type: "presence",
    users: getConnectedUsers(),
  });

  // Manejo de mensajes desde el cliente
  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (e) {
      console.error("Mensaje inválido:", message);
      return;
    }

    if (data.type === "join" && data.name) {
      // El cliente propone un nombre
      const oldName = ws.user.name;
      ws.user.name = data.name;

      broadcast({
        type: "system",
        text: `${oldName} ahora es ${ws.user.name}`,
        timestamp: new Date().toISOString(),
      });

      broadcast({
        type: "presence",
        users: getConnectedUsers(),
      });
    }

    if (data.type === "rename" && data.newName) {
      const oldName = ws.user.name;
      ws.user.name = data.newName;

      broadcast({
        type: "system",
        text: `${oldName} ahora es ${ws.user.name}`,
        timestamp: new Date().toISOString(),
      });

      broadcast({
        type: "presence",
        users: getConnectedUsers(),
      });
    }

    if (data.type === "chat" && data.text) {
      broadcast({
        type: "chat",
        user: ws.user.name,
        text: data.text,
        timestamp: new Date().toISOString(),
      });
    }
  });

  ws.on("close", () => {
    console.log(`Conexión cerrada: ${ws.user.name}`);

    broadcast({
      type: "system",
      text: `${ws.user.name} se ha desconectado`,
      timestamp: new Date().toISOString(),
    });

    broadcast({
      type: "presence",
      users: getConnectedUsers(),
    });
  });
});