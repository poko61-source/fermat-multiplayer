import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});

const rooms = new Map();

const MAX_PLAYERS = 4;
const TOTAL_PUZZLES = 5;
const GAME_DURATION = 10 * 60;

app.get("/", (req, res) => {
  res.send(
    "Servidor multijugador de La Habitación de Fermat funcionando."
  );
});

app.get("/test", (req, res) => {
  res.sendFile(
    new URL("./test.html", import.meta.url).pathname
  );
});


function createGameState() {

  return {
    status: "waiting",
    currentPuzzle: 0,
    puzzlesSolved: 0,
    totalPuzzles: TOTAL_PUZZLES,
    timeRemaining: GAME_DURATION,
    players: []
  };

}


function getRoomState(room) {

  return {
    status: room.status,
    currentPuzzle: room.currentPuzzle,
    puzzlesSolved: room.puzzlesSolved,
    totalPuzzles: room.totalPuzzles,
    timeRemaining: room.timeRemaining,
    players: room.players.length
  };

}


function broadcastRoomState(roomCode) {

  const room = rooms.get(roomCode);

  if (!room) {
    return;
  }

  io.to(roomCode).emit(
    "roomState",
    getRoomState(room)
  );

}


io.on("connection", (socket) => {

  console.log(
    "Jugador conectado:",
    socket.id
  );


  socket.on("createRoom", () => {

    let roomCode;

    do {

      roomCode = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();

    } while (rooms.has(roomCode));


    const room = {
      ...createGameState(),
      players: []
    };


    rooms.set(
      roomCode,
      room
    );


    socket.join(roomCode);

    room.players.push(socket.id);

    socket.roomCode = roomCode;


    socket.emit(
      "roomCreated",
      {
        roomCode
      }
    );


    broadcastRoomState(roomCode);


    console.log(
      "Sala creada:",
      roomCode
    );

  });


  socket.on(
    "joinRoom",
    (roomCode) => {

      const code =
        String(roomCode)
          .trim()
          .toUpperCase();


      const room =
        rooms.get(code);


      if (!room) {

        socket.emit(
          "roomError",
          "La sala no existe."
        );

        return;
      }


      if (
        room.players.length >=
        MAX_PLAYERS
      ) {

        socket.emit(
          "roomError",
          "La sala está llena."
        );

        return;
      }


      if (
        room.status !==
        "waiting"
      ) {

        socket.emit(
          "roomError",
          "La partida ya ha comenzado."
        );

        return;
      }


      socket.join(code);

      room.players.push(
        socket.id
      );

      socket.roomCode = code;


      io.to(code).emit(
        "playersUpdated",
        {
          players:
            room.players.length
        }
      );


      broadcastRoomState(code);


      console.log(
        "Jugador unido:",
        socket.id,
        "Sala:",
        code
      );

    }
  );


  socket.on(
    "startGame",
    () => {

      const roomCode =
        socket.roomCode;

      if (!roomCode) {
        return;
      }


      const room =
        rooms.get(roomCode);

      if (!room) {
        return;
      }


      if (
        room.players[0] !==
        socket.id
      ) {

        return;
      }


      if (
        room.players.length < 2
      ) {

        socket.emit(
          "roomError",
          "Se necesitan al menos 2 jugadores."
        );

        return;
      }


      if (
        room.status !==
        "waiting"
      ) {

        return;
      }


      room.status = "playing";

      room.currentPuzzle = 1;

      room.puzzlesSolved = 0;

      room.timeRemaining =
        GAME_DURATION;


      broadcastRoomState(
        roomCode
      );


      console.log(
        "Partida iniciada:",
        roomCode
      );

    }
  );


  socket.on(
    "puzzleSolved",
    () => {

      const roomCode =
        socket.roomCode;

      const room =
        rooms.get(roomCode);

      if (!room) {
        return;
      }


      if (
        room.status !==
        "playing"
      ) {

        return;
      }


      room.puzzlesSolved += 1;


      if (
        room.puzzlesSolved >=
        room.totalPuzzles
      ) {

        room.status =
          "victory";

      } else {

        room.currentPuzzle += 1;

      }


      broadcastRoomState(
        roomCode
      );

    }
  );


  socket.on("disconnect", () => {

    const roomCode =
      socket.roomCode;


    if (!roomCode) {
      return;
    }


    const room =
      rooms.get(roomCode);


    if (!room) {
      return;
    }


    room.players =
      room.players.filter(
        (id) =>
          id !== socket.id
      );


    if (
      room.players.length === 0
    ) {

      rooms.delete(
        roomCode
      );

      console.log(
        "Sala eliminada:",
        roomCode
      );

      return;
    }


    broadcastRoomState(
      roomCode
    );


    console.log(
      "Jugador desconectado:",
      socket.id
    );

  });

});


const PORT =
  process.env.PORT || 3000;


httpServer.listen(
  PORT,
  () => {

    console.log(
      `Servidor escuchando en el puerto ${PORT}`
    );

  }
);
