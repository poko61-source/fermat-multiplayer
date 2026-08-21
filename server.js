import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

app.get("/test", (req, res) => {
  res.sendFile(
    new URL("./test.html", import.meta.url).pathname
  );
});

const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});

const rooms = new Map();

app.get("/", (req, res) => {
  res.send("Servidor multijugador de La Habitación de Fermat funcionando.");
});

io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  socket.on("createRoom", () => {
    const roomCode = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();

    rooms.set(roomCode, {
      players: []
    });

    socket.join(roomCode);

    rooms.get(roomCode).players.push(socket.id);

    socket.emit("roomCreated", {
      roomCode,
      players: rooms.get(roomCode).players.length
    });

    console.log("Sala creada:", roomCode);
  });

  socket.on("joinRoom", (roomCode) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit("roomError", "La sala no existe.");
      return;
    }

    if (room.players.length >= 4) {
      socket.emit("roomError", "La sala está llena.");
      return;
    }

    socket.join(roomCode);
    room.players.push(socket.id);

    io.to(roomCode).emit("playersUpdated", {
      players: room.players.length
    });

    console.log(
      "Jugador unido a",
      roomCode,
      "Jugadores:",
      room.players.length
    );
  });

  socket.on("disconnect", () => {
    for (const [roomCode, room] of rooms) {
      const index = room.players.indexOf(socket.id);

      if (index !== -1) {
        room.players.splice(index, 1);

        io.to(roomCode).emit("playersUpdated", {
          players: room.players.length
        });

        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log("Sala eliminada:", roomCode);
        }

        break;
      }
    }

    console.log("Jugador desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
