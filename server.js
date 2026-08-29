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
const ROOM_IDLE_TIMEOUT = 15 * 60 * 1000;

function createUniquePlayerToken(room) {

  let token;

  do {

    token =
      Math.random().toString(36).slice(2) +
      "-" +
      Date.now().toString(36);

  } while (
    room.playerTokens &&
    room.playerTokens[token]
  );

  return token;
}


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

function createQuestionPool() {

  const questions =
    Array.from(
      { length: 19 },
      (_, index) =>
        index + 1
    );

  for (
    let i = questions.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      questions[i],
      questions[j]
    ] = [
      questions[j],
      questions[i]
    ];
  }

  return questions;
}

function createGameState() {
  return {
    status: "waiting",
    currentLevel: 1,
    completedLevels: [],
    currentPuzzle: 0,
    puzzlesSolved: 0,
    totalPuzzles: TOTAL_PUZZLES,
    timeRemaining: GAME_DURATION,

    bonusActive: false,
    bonusRemaining: 0,

    players: [],
    playerTokens: {},
    hostToken: null,
    lastActivityAt: Date.now(),
    questionPool: [],
    failCount: 0,

    // Jugadores que deben reaparecer en el siguiente nivel.
    nextLevelPlayerTokens: [],
    nextLevelReady: {}
  };
}


// --------------------------------------------------
// ESTADO QUE SE ENVÍA A LOS JUGADORES
// --------------------------------------------------

function getRoomState(room) {
  return {
    status: room.status,
    currentLevel: room.currentLevel,
    completedLevels: room.completedLevels,

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
      room.players[0],
    hostToken:
      room.hostToken
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
// TRANSICIÓN SINCRONIZADA AL SIGUIENTE NIVEL
// --------------------------------------------------

function startNextLevelIfReady(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  // Compatibilidad con salas creadas antes de este cambio.
  if (!Array.isArray(room.nextLevelPlayerTokens)) room.nextLevelPlayerTokens = [];
  if (!room.nextLevelReady || typeof room.nextLevelReady !== "object") {
    room.nextLevelReady = {};
  }

  // Solo avanzamos desde una pantalla de victoria y una sola vez.
  if (room.status !== "victory") return;

  const expected = Array.isArray(room.nextLevelPlayerTokens)
    ? room.nextLevelPlayerTokens.filter(Boolean)
    : [];

  if (!expected.length) return;

  const allReady = expected.every(
    token => room.nextLevelReady[token] === true
  );

  if (!allReady) {
    broadcastRoomState(roomCode);
    return;
  }

  room.currentLevel += 1;
  room.status = "playing";
  room.currentPuzzle = 1;
  room.questionPool = createQuestionPool();
  room.currentQuestion = room.questionPool.shift();
  room.currentQuestionResolved = false;
  room.puzzlesSolved = 0;
  room.failCount = 0;
  room.timeRemaining = GAME_DURATION;
  room.bonusActive = false;
  room.bonusRemaining = 0;
  room.lastActivityAt = Date.now();

  // La transición ya se ha consumado.
  room.nextLevelPlayerTokens = [];
  room.nextLevelReady = {};

  broadcastRoomState(roomCode);

  console.log(
    "NIVEL INICIADO PARA TODA LA SALA:",
    roomCode,
    "Nivel:",
    room.currentLevel,
    "Acertijo:",
    room.currentQuestion
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
    (data = {}) => {

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

      const playerToken =
        String(data?.playerToken || "").trim();

      if (!playerToken) {
        socket.emit("roomError", "Identidad de jugador no válida.");
        return;
      }

      room.playerTokens[playerToken] = socket.id;
      room.hostToken = playerToken;


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

      room.lastActivityAt = Date.now();

      socket.roomCode =
        roomCode;
      socket.playerToken =
        playerToken;


      socket.emit(
        "roomCreated",
        {
          roomCode,
          hostToken:
            room.hostToken
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
    (data = {}) => {

      const code =
        String(
          data?.roomCode || ""
        )
          .trim()
          .toUpperCase();

      let playerToken =
        String(
          data?.playerToken || ""
        ).trim();

      if (!playerToken) {

        playerToken =
          createUniquePlayerToken(
            rooms.get(code) || {
              playerTokens: {}
            }
          );
      }

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

      /*
       * Si el token ya pertenece a otro jugador de esta sala,
       * generar uno nuevo. Esto evita que dos navegadores
       * compartan accidentalmente la identidad del anfitrión
       * por haber copiado el localStorage.
       */
      if (
        room.playerTokens &&
        room.playerTokens[playerToken] &&
        room.playerTokens[playerToken] !==
          socket.id
      ) {

        playerToken =
          createUniquePlayerToken(
            room
          );

        socket.emit(
          "playerTokenAssigned",
          {
            playerToken
          }
        );
      }

      socket.join(code);

      room.playerTokens =
        room.playerTokens || {};

      room.players.push(
        socket.id
      );

      room.playerTokens[playerToken] =
        socket.id;

      room.lastActivityAt =
        Date.now();

      socket.roomCode =
        code;

      socket.playerToken =
        playerToken;

      socket.emit(
        "roomJoined",
        {
          roomCode:
            code,
          playerToken
        }
      );

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
        code,
        "Token:",
        playerToken
      );
    }
  );


  // ------------------------------------------------
  // REANUDAR PARTIDA DESDE PÁGINA PRINCIPAL
  // ------------------------------------------------
 TRAS CAMBIO DE PÁGINA
  // ------------------------------------------------

    socket.on(
    "hostReturnToMain",
    (data = {}) => {

      const roomCode =
        socket.roomCode ||
        String(data?.roomCode || "")
          .trim()
          .toUpperCase();

      const playerToken =
        String(
          data?.playerToken ||
          socket.playerToken ||
          ""
        ).trim();

      const room =
        rooms.get(roomCode);

      if (
        !room ||
        playerToken !== room.hostToken ||
        room.status !== "victory"
      ) {
        return;
      }

      io.to(roomCode).emit(
        "navigateToMain"
      );
    }
  );


  socket.on(
    "hostSelectLevel",
    (data = {}) => {

      const roomCode =
        socket.roomCode;

      const room =
        rooms.get(roomCode);

      const targetLevel =
        Number(data?.targetLevel);

      if (
        !room ||
        socket.playerToken !== room.hostToken ||
        room.status !== "victory" ||
        targetLevel !==
          (room.currentLevel || 1) + 1
      ) {
        return;
      }

      io.to(roomCode).emit(
        "navigateToLevel",
        {
          level:
            targetLevel
        }
      );
    }
  );


  socket.on(
    "resumeMainRoom",
    (data = {}) => {

      const roomCode =
        String(data?.roomCode || "")
          .trim()
          .toUpperCase();

      const playerToken =
        String(data?.playerToken || "")
          .trim();

      const room =
        rooms.get(roomCode);

      if (!room || !playerToken) {
        return;
      }

      const oldSocket =
        room.playerTokens[playerToken];

      if (
        oldSocket &&
        oldSocket !== socket.id
      ) {
        /*
         * No reasignamos silenciosamente la identidad.
         * El mismo token debe representar al mismo jugador.
         */
        socket.emit(
          "roomError",
          "La identidad del jugador ya está siendo usada."
        );
        return;
      }

      if (
        !room.players.includes(socket.id)
      ) {
        if (
          room.players.length >= MAX_PLAYERS
        ) {
          return;
        }
        room.players.push(socket.id);
      }

      room.playerTokens[playerToken] =
        socket.id;

      socket.roomCode =
        roomCode;

      socket.playerToken =
        playerToken;

      socket.join(roomCode);

      room.lastActivityAt =
        Date.now();

      socket.emit(
        "roomState",
        getRoomState(room)
      );

      broadcastRoomState(
        roomCode
      );
    }
  );


socket.on(
    "resumeRoom",
    (data = {}) => {
      const roomCode = String(data?.roomCode || "").trim().toUpperCase();
      const playerToken = String(data?.playerToken || "").trim();
      const room = rooms.get(roomCode);

      if (!room || !playerToken) {
        socket.emit("roomError", "No se puede reanudar la partida.");
        return;
      }

      const previousSocketId = room.playerTokens[playerToken];

      if (previousSocketId && previousSocketId !== socket.id) {
        room.players = room.players.filter((id) => id !== previousSocketId);
      }

      if (!room.players.includes(socket.id)) {
        if (room.players.length >= MAX_PLAYERS) {
          socket.emit("roomError", "La sala está llena.");
          return;
        }
        room.players.push(socket.id);
      }

      room.playerTokens[playerToken] = socket.id;
      room.lastActivityAt = Date.now();
      socket.roomCode = roomCode;
      socket.playerToken = playerToken;
      socket.join(roomCode);

      // Si este jugador está entrando al nivel siguiente, queda marcado
      // como listo. El servidor solo abrirá el nuevo nivel cuando TODOS
      // los jugadores que terminaron el nivel anterior hayan reaparecido.
      const targetLevel = Number(data?.targetLevel);
      if (
        room.status === "victory" &&
        Number.isInteger(targetLevel) &&
        targetLevel === room.currentLevel + 1
      ) {
        if (!Array.isArray(room.nextLevelPlayerTokens) ||
            room.nextLevelPlayerTokens.length === 0) {
          room.nextLevelPlayerTokens = Object.keys(room.playerTokens);
        }

        room.nextLevelReady[playerToken] = true;
        console.log(
          "Jugador listo para siguiente nivel:",
          roomCode,
          playerToken
        );
      }

      broadcastRoomState(roomCode);
      startNextLevelIfReady(roomCode);

      console.log(
        "Partida reanudada:",
        roomCode,
        "Nivel:",
        room.currentLevel,
        "Jugador:",
        socket.id
      );
    }
  );


  // ------------------------------------------------
  // CONTINUAR AL SIGUIENTE NIVEL
  // ------------------------------------------------

  socket.on(
    "continueLevel",
    (data = {}) => {
      const roomCode = socket.roomCode;
      const room = rooms.get(roomCode);
      const targetLevel = Number(data?.targetLevel);

      if (!room || !Number.isInteger(targetLevel)) return;
      if (targetLevel !== room.currentLevel + 1) return;
      if (!room.completedLevels.includes(room.currentLevel)) return;
      if (room.status !== "victory") return;

      // Compatibilidad con clientes antiguos: continueLevel significa
      // "estoy listo", nunca "empieza el nivel tú solo".
      if (!Array.isArray(room.nextLevelPlayerTokens) ||
          room.nextLevel
