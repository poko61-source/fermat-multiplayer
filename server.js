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
const PUZZLE_BONUS = 30;


// --------------------------------------------------
// PÁGINAS
// --------------------------------------------------

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


// --------------------------------------------------
// CREAR ESTADO DE UNA PARTIDA
// --------------------------------------------------

function createGameState() {
  return {
    status: "waiting",
    currentPuzzle: 0,
    puzzlesSolved: 0,
    totalPuzzles: TOTAL_PUZZLES,
    timeRemaining: GAME_DURATION,

    bonusActive: false,
    bonusRemaining: 0,

    players: []
  };
}


// --------------------------------------------------
// ESTADO QUE SE ENVÍA A LOS JUGADORES
// --------------------------------------------------

function getRoomState(room) {
  return {
    status: room.status,

    currentPuzzle:
      room.currentPuzzle,

    currentQuestion:
      room.currentQuestion,

    puzzlesSolved:
      room.puzzlesSolved,

    totalPuzzles:
      room.totalPuzzles,

    timeRemaining:
      room.timeRemaining,

    bonusActive:
      room.bonusActive,

    bonusRemaining:
      room.bonusRemaining,

    players:
      room.players.length,
    hostId:
      room.players[0]
  };
}


// --------------------------------------------------
// ENVIAR ESTADO A TODA LA SALA
// --------------------------------------------------

function broadcastRoomState(roomCode) {

  const room =
    rooms.get(roomCode);

  if (!room) {
    return;
  }

  io.to(roomCode).emit(
    "roomState",
    getRoomState(room)
  );
}


// --------------------------------------------------
// CONEXIONES
// --------------------------------------------------

io.on("connection", (socket) => {

  console.log(
    "Jugador conectado:",
    socket.id
  );


  // ------------------------------------------------
  // CREAR SALA
  // ------------------------------------------------

  socket.on(
    "createRoom",
    () => {

      let roomCode;

      do {

        roomCode =
          Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase();

      } while (
        rooms.has(roomCode)
      );


      const room =
        createGameState();


      rooms.set(
        roomCode,
        room
      );


      socket.join(
        roomCode
      );


      room.players.push(
        socket.id
      );


      socket.roomCode =
        roomCode;


      socket.emit(
        "roomCreated",
        {
          roomCode
        }
      );


      broadcastRoomState(
        roomCode
      );


      console.log(
        "Sala creada:",
        roomCode
      );

    }
  );


  // ------------------------------------------------
  // UNIRSE A SALA
  // ------------------------------------------------

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


      socket.join(
        code
      );


      room.players.push(
        socket.id
      );


      socket.roomCode =
        code;


      io.to(code).emit(
        "playersUpdated",
        {
          players:
            room.players.length
        }
      );


      broadcastRoomState(
        code
      );


      console.log(
        "Jugador unido:",
        socket.id,
        "Sala:",
        code
      );

    }
  );


  // ------------------------------------------------
  // INICIAR PARTIDA
  // ------------------------------------------------

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


      // Solo el creador puede iniciar.
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


      room.status =
        "playing";


      room.currentPuzzle =
        1;

      room.currentQuestion =
        Math.floor(
          Math.random() * 19
        ) + 1;

      room.currentQuestionResolved =
        false;


      room.puzzlesSolved =
        0;


      room.timeRemaining =
        GAME_DURATION;


      room.bonusActive =
        false;


      room.bonusRemaining =
        0;


      broadcastRoomState(
        roomCode
      );


      console.log(
        "Partida iniciada:",
        roomCode
      );

    }
  );


  // ------------------------------------------------
  // ACERTIJO RESUELTO
  // ------------------------------------------------

  socket.on(
    "puzzleSolved",
    (data) => {

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


      /*
       * Evitar dos registros del mismo
       * acertijo durante la pausa.
       */

      if (
        room.bonusActive
      ) {

        return;
      }

      

      if (
        room.currentQuestionResolved
      ) {
        return;
      }

room.currentQuestionResolved = true;


      /*
       * Registrar inmediatamente
       * el acierto.
       */

      room.puzzlesSolved += 1;

      if (
      room.puzzlesSolved >=
      room.totalPuzzles
      ) {

      room.puzzlesSolved =
        room.totalPuzzles;

      room.currentPuzzle =
        room.totalPuzzles;

      room.status =
        "victory";

      room.bonusActive =
        false;

      room.bonusRemaining =
        0;

    } else {

      room.currentPuzzle += 1;

      room.currentQuestion =
        Math.floor(
          Math.random() * 19
        ) + 1;

      room.currentQuestionResolved =
    false;

      room.bonusActive =
        true;

      room.bonusRemaining =
        PUZZLE_BONUS;
    }

      room.currentPuzzle +=
        1;

      room.currentQuestion =
        Math.floor(
          Math.random() * 19
        ) + 1;

      /*
       * Si se han conseguido los
       * 5 aciertos, termina la partida.
       */

      if (
        room.puzzlesSolved >=
        room.totalPuzzles
      ) {

        room.puzzlesSolved =
          room.totalPuzzles;


        room.status =
          "victory";


        room.bonusActive =
          false;


        room.bonusRemaining =
          0;

      } else {

       
        /*
         * El reloj global se detiene
         * durante 30 segundos.
         */

        room.bonusActive =
          true;


        room.bonusRemaining =
          PUZZLE_BONUS;

      }


      broadcastRoomState(
        roomCode
      );


      console.log(
        "Acertijo resuelto:",
        roomCode,
        room.puzzlesSolved,
        "/",
        room.totalPuzzles,
        "Pausa:",
        room.bonusRemaining
      );

    }
  );


  // ------------------------------------------------
  // DESCONEXIÓN
  // ------------------------------------------------

  socket.on(
    "disconnect",
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

    }
  );

});


// --------------------------------------------------
// RELOJ GLOBAL DEL SERVIDOR
// --------------------------------------------------

setInterval(
  () => {

    for (
      const [roomCode, room]
      of rooms
    ) {

      if (
        room.status !==
        "playing"
      ) {

        continue;
      }


      /*
       * DURANTE LA BONIFICACIÓN:
       *
       * El tiempo global NO disminuye.
       */

      if (
        room.bonusActive
      ) {

        room.bonusRemaining -=
          1;


        if (
          room.bonusRemaining <=
          0
        ) {

          room.bonusRemaining =
            0;


          room.bonusActive =
            false;

        }

      } else {

        /*
         * RELOJ NORMAL
         */

        room.timeRemaining -=
          1;


        if (
          room.timeRemaining <=
          0
        ) {

          room.timeRemaining =
            0;


          room.status =
            "defeat";


          console.log(
            "Tiempo agotado:",
            roomCode
          );

        }

      }


      broadcastRoomState(
        roomCode
      );

    }

  },
  1000
);


// --------------------------------------------------
// ARRANCAR SERVIDOR
// --------------------------------------------------

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
