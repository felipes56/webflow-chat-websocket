// server/server.js
// Servidor HTTP + WebSocket para el chat colaborativo

const http = require("http");
const WebSocket = require("ws");

// En Render el puerto viene de process.env.PORT.
// En local usamos 3000.
const PORT = process.env.PORT || 3000;

// Servidor HTTP simple (lo necesita Render para el health check)
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket chat server is running\n");
});

// Servidor WebSocket montado sobre el HTTP
const wss = new WebSocket.Server({ server });

let nextId = 1;

console.log("Iniciando servidor WebSocket...");

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
  const random = Math.floor(Math.random() * 900) + 100;
  ws.user = {
    id: nextId++,
    name: `Usuario_${random}`,
  };

  console.log(`Nueva conexión: ${ws.user.name}`);

  // mensaje solo para este cliente
  ws.send(
    JSON.stringify({
      type: "welcome",
      selfName: ws.user.name,
      timestamp: new Date().toISOString(),
    })
  );

  // mensaje para todos
  broadcast({
    type: "system",
    text: `${ws.user.name} se ha unido al chat`,
    timestamp: new Date().toISOString(),
  });

  // actualizar lista de usuarios
  broadcast({
    type: "presence",
    users: getConnectedUsers(),
  });

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (e) {
      console.error("Mensaje inválido:", message.toString());
      return;
    }

    if (data.type === "join" && data.name) {
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

// Escucha en todas las interfaces (local + Render)
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor HTTP+WebSocket escuchando en puerto ${PORT}`);
});
