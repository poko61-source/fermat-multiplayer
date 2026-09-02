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
const POINTS_PER_SOLVED = 500;
const POINTS_PER_FAIL = 50;
const ESCAPE_BONUS = 500;
const MAX_TIME_BONUS = 500;
const ROOM_IDLE_TIMEOUT = 15 * 60 * 1000;

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

function createPlayerToken() {

  return (
    "p_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 12)
  );
}


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
    score: 0,
    totalPuzzles: TOTAL_PUZZLES,
    timeRemaining: GAME_DURATION,

    bonusActive: false,
    bonusRemaining: 0,

    players: [],
    playerTokens: {},
    hostToken: null,
    hostSocketId: null,
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
    score:
      room.score,
    hostId:
      room.players[0],
    hostToken:
      room.hostToken,
    hostSocketId:
      room.hostSocketId
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

  room.players.forEach(
    playerSocketId => {

      io.to(
        playerSocketId
      ).emit(
        "roomState",
        {
          ...getRoomState(
            room
          ),
          isHost:
            playerSocketId ===
              room.hostSocketId
        }
      );
    }
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
// NAVEGACIÓN ROBUSTA DE TODA LA SALA
// --------------------------------------------------
function broadcastNextLevelNavigation(
  roomCode,
  room
) {

  if (!room) return;

  const payload = {
    level:
      room.currentLevel,
    currentPuzzle:
      room.currentPuzzle,
    currentQuestion:
      room.currentQuestion,
    timeRemaining:
      room.timeRemaining
  };

  const socketIds =
    new Set();

  Object.values(
    room.playerTokens || {}
  ).forEach(
    socketId => {
      if (socketId) {
        socketIds.add(
          socketId
        );
      }
    }
  );

  (room.players || []).forEach(
    socketId => {
      if (socketId) {
        socketIds.add(
          socketId
        );
      }
    }
  );

  if (room.hostSocketId) {
    socketIds.add(
      room.hostSocketId
    );
  }

  socketIds.forEach(
    socketId => {
      if (
        io.sockets.sockets.has(
          socketId
        )
      ) {
        io.to(socketId).emit(
          "navigateToLevel",
          payload
        );
      }
    }
  );



  /*
   * Respaldo por room: cualquier invitado que mantenga su
   * pertenencia a la sala recibe la transición.
   */
  io.to(
    roomCode
  ).emit(
    "navigateToLevel",
    payload
  );

  console.log(
    "MULTIJUGADOR: navigateToLevel enviado",
    {
      roomCode,
      level:
        room.currentLevel,
      sockets:
        Array.from(
          socketIds
        )
    }
  );
}


// --------------------------------------------------
// INICIAR SIGUIENTE NIVEL DIRECTAMENTE EN MULTIJUGADOR
// --------------------------------------------------

function startNextLevelForRoom(
  roomCode,
  targetLevel,
  sourceSocketId
) {

  const room =
    rooms.get(
      roomCode
    );

  if (
    !room
  ) {
    return false;
  }

  if (
    !Number.isInteger(
      targetLevel
    ) ||
    targetLevel !==
      (room.currentLevel || 1) + 1
  ) {
    return false;
  }

  room.currentLevel =
    targetLevel;

  room.returningToMain =
    false;

  room.pendingNavigationLevel =
    targetLevel;

  room.status =
    "playing";

  room.currentPuzzle =
    1;

  room.questionPool =
    createQuestionPool();

  room.currentQuestion =
    room.questionPool.shift();

  room.currentQuestionResolved =
    false;

  room.puzzlesSolved =
    0;

  room.failCount =
    0;

  room.timeRemaining =
    GAME_DURATION;

  room.questionStartedAt =
    Date.now();

  room.bonusActive =
    false;

  room.bonusRemaining =
    0;

  room.finalScore =
    null;

  room.lastActivityAt =
    Date.now();

  /*
   * Guardamos el Nivel 2 como destino de reanudación.
   * Los navegadores lo usarán al cargar Nivel 2.
   */
  room.nextLevelPlayerTokens =
    Object.keys(
      room.playerTokens || {}
    ).filter(Boolean);

  room.nextLevelReady =
    {};

  broadcastRoomState(
    roomCode
  );

  broadcastNextLevelNavigation(
    roomCode,
    room
  );

  /*
   * Repetimos la orden durante unos segundos para cubrir
   * la reconexión del invitado al cambiar de documento.
   */
  [500, 1500, 3000, 5000].forEach(
    delay => {
      setTimeout(
        () => {

          const currentRoom =
            rooms.get(
              roomCode
            );

          if (
            !currentRoom ||
            currentRoom.currentLevel !==
              targetLevel ||
            currentRoom.status !==
              "playing"
          ) {
            return;
          }

          broadcastNextLevelNavigation(
            roomCode,
            currentRoom
          );

        },
        delay
      );
    }
  );


  console.log(
    "MULTIJUGADOR: salto directo al siguiente nivel",
    {
      roomCode,
      targetLevel,
      sourceSocketId,
      currentQuestion:
        room.currentQuestion,
      players:
        room.players.length
    }
  );

  return true;
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
      room.hostSocketId = socket.id;


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
          playerToken,
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
          data?.roomCode || data || ""
        )
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
        room.status !==
        "waiting"
      ) {
        socket.emit(
          "roomError",
          "La partida ya ha comenzado."
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

      room.playerTokens =
        room.playerTokens || {};

      let playerToken;

      do {
        playerToken =
          "p_" +
          Date.now().toString(36) +
          "_" +
          Math.random()
            .toString(36)
            .slice(2, 12);
      } while (
        room.playerTokens[playerToken]
      );

      room.players.push(
        socket.id
      );

      room.playerTokens[playerToken] =
        socket.id;

      socket.roomCode =
        code;

      socket.playerToken =
        playerToken;

      room.lastActivityAt =
        Date.now();

      socket.join(
        code
      );

      socket.emit(
        "roomJoined",
        {
          roomCode:
            code,
          playerToken:
            playerToken,
          hostToken:
            room.hostToken
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
        "playerToken:",
        playerToken,
        "hostToken:",
        room.hostToken
      );
    }
  );


  // ------------------------------------------------
  // REANUDAR PARTIDA TRAS CAMBIO DE PÁGINA
  // ------------------------------------------------


    socket.on(
    "requestReturnToMain",
    () => {

      const roomCode =
        socket.roomCode;

      const room =
        rooms.get(
          roomCode
        );

      if (
        !room
      ) {
        return;
      }

      if (
        room.returningToMain ===
          true &&
        Number(
          room.currentLevel ||
            1
        ) === 1
      ) {

        socket.emit(
          "navigateToMain",
          {
            completedLevel:
              room.currentLevel
          }
        );
      }
    }
  );


  socket.on(
    "hostReturnToMain",
    (data = {}) => {

      const roomCode =
        socket.roomCode ||
        String(
          data?.roomCode || ""
        ).trim().toUpperCase();

      const playerToken =
        String(
          data?.playerToken ||
          socket.playerToken ||
          ""
        ).trim();

      const room =
        rooms.get(
          roomCode
        );

      if (
        !room ||
        playerToken !==
          room.hostToken
      ) {
        socket.emit(
          "hostReturnToMainError",
          {
            message:
              "La orden solo puede ejecutarla el anfitrión."
          }
        );
        return;
      }

      /*
       * Marcamos que la sala está en la transición al
       * índice. Este estado queda almacenado aunque un
       * navegador pierda el evento durante la navegación.
       */
      room.returningToMain =
        false;

      room.lastActivityAt =
        Date.now();
      /*
       * Solo el anfitrión vuelve al índice.
       * El invitado permanece en la pantalla final.
       */
      socket.emit(
        "navigateToMain",
        {
          completedLevel:
            room.currentLevel
        }
      );

/*
       * Confirmación directa al socket que lanzó la orden.
       * Esto permite al anfitrión cambiar de página incluso si
       * su socket original se cerró al mostrar la victoria.
       */
      socket.emit(
        "hostReturnToMainAccepted",
        {
          completedLevel:
            room.currentLevel
        }
      );

      console.log(
        "HOST: regreso a principal",
        {
          roomCode,
          playerToken
        }
      );
    }
  );


  socket.on(
    "hostContinueToNextLevel",
    (data = {}) => {

      const roomCode =
        socket.roomCode ||
        String(
          data?.roomCode || ""
        ).trim().toUpperCase();

      const playerToken =
        String(
          data?.playerToken ||
          socket.playerToken ||
          ""
        ).trim();

      const room =
        rooms.get(
          roomCode
        );

      if (
        !room ||
        !playerToken
      ) {
        return;
      }

      const isHost =
        playerToken ===
          room.hostToken;

      if (
        !isHost ||
        room.status !==
          "victory"
      ) {

        socket.emit(
          "hostContinueToNextLevelError",
          {
            message:
              "Solo el anfitrión puede iniciar el siguiente nivel."
          }
        );

        return;
      }

      const targetLevel =
        Number(
          data?.targetLevel || 2
        );

      const started =
        startNextLevelForRoom(
          roomCode,
          targetLevel,
          socket.id
        );

      if (
        !started
      ) {

        socket.emit(
          "hostContinueToNextLevelError",
          {
            message:
              "No se pudo iniciar el siguiente nivel."
          }
        );

        return;
      }

      socket.emit(
        "hostContinueToNextLevelAccepted",
        {
          level:
            targetLevel
        }
      );

      socket.emit(
        "navigateToLevel",
        {
          level: targetLevel,
          currentPuzzle: room.currentPuzzle,
          currentQuestion: room.currentQuestion,
          timeRemaining: room.timeRemaining
        }
      );
    }
  );


  socket.on(
    "hostSelectLevel",
    (data = {}) => {

      const roomCode =
        socket.roomCode ||
        String(
          data?.roomCode || ""
        ).trim().toUpperCase();

      const playerToken =
        String(
          data?.playerToken ||
          socket.playerToken ||
          ""
        ).trim();

      const room =
        rooms.get(
          roomCode
        );

      if (
        !room ||
        playerToken !==
          room.hostToken
      ) {

        socket.emit(
          "hostSelectLevelError",
          {
            message:
              "Solo el anfitrión puede iniciar el siguiente nivel."
          }
        );

        return;
      }

      if (
        room.status !==
        "victory"
      ) {

        socket.emit(
          "hostSelectLevelError",
          {
            message:
              "La sala no está en pantalla final."
          }
        );

        return;
      }

      const targetLevel =
        Number(
          data?.targetLevel || 2
        );

      const started =
        startNextLevelForRoom(
          roomCode,
          targetLevel,
          socket.id
        );

      if (
        !started
      ) {

        socket.emit(
          "hostSelectLevelError",
          {
            message:
              "Nivel solicitado no válido."
          }
        );

        return;
      }

      socket.emit(
        "hostSelectLevelAccepted",
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
        String(
          data?.roomCode || ""
        ).trim().toUpperCase();

      const playerToken =
        String(
          data?.playerToken || ""
        ).trim();

      const room =
        rooms.get(roomCode);

      if (
        !room ||
        !playerToken
      ) {
        return;
      }

      const oldSocketId =
        room.playerTokens[playerToken];

      /*
       * Un jugador puede tardar unas décimas en desconectarse
       * al cambiar de página. La identidad lógica es el token:
       * sustituimos SIEMPRE el socket anterior por el nuevo,
       * incluso si Socket.IO todavía lo considera conectado.
       */
      if (
        oldSocketId &&
        oldSocketId !==
          socket.id
      ) {

        room.players =
          room.players.map(
            id =>
              id ===
                oldSocketId
                ? socket.id
                : id
          );

        if (
          io.sockets.sockets.has(
            oldSocketId
          )
        ) {
          const oldSocket =
            io.sockets.sockets.get(
              oldSocketId
            );

          if (
            oldSocket &&
            oldSocket.id !==
              socket.id
          ) {
            oldSocket.disconnect(
              true
            );
          }
        }
      }

      if (
        !room.players.includes(
          socket.id
        )
      ) {

        room.players.push(
          socket.id
        );
      }

      room.playerTokens[playerToken] =
        socket.id;

      socket.roomCode =
        roomCode;

      socket.playerToken =
        playerToken;

      if (
        playerToken ===
        room.hostToken
      ) {
        room.hostSocketId =
          socket.id;
      }

      socket.join(
        roomCode
      );

      room.lastActivityAt =
        Date.now();

      if (
        Number(
          room.currentLevel || 1
        ) >= 2 &&
        room.status ===
          "playing"
      ) {

        socket.emit(
          "navigateToLevel",
          {
            level:
              room.currentLevel,
            currentPuzzle:
              room.currentPuzzle,
            currentQuestion:
              room.currentQuestion,
            timeRemaining:
              room.timeRemaining
          }
        );
      }

      if (
        room.returningToMain ===
        true
      ) {

        socket.emit(
          "navigateToMain",
          {
            completedLevel:
              room.currentLevel
          }
        );
      }

      socket.emit(
        "mainRoomReady",
        {
          roomCode,
          players:
            room.players.length,
          completedLevels:
            room.completedLevels,
          currentLevel:
            room.currentLevel,
          hostToken:
            room.hostToken,
          isHost:
            playerToken ===
              room.hostToken
        }
      );

      socket.emit(
        "roomState",
        {
          ...getRoomState(
            room
          ),
          isHost:
            playerToken ===
              room.hostToken
        }
      );

      if (
        Number(room.pendingNavigationLevel || 0) === 2 &&
        Number(room.currentLevel || 0) === 2 &&
        room.status === "playing"
      ) {
        socket.emit("navigateToLevel", {
          level: 2,
          currentPuzzle: room.currentPuzzle,
          currentQuestion: room.currentQuestion,
          timeRemaining: room.timeRemaining
        });
      }

      broadcastRoomState(
        roomCode
      );
    }
  );


  socket.on(
    "resumeRoom",
    (data = {}) => {

      const roomCode =
        String(
          data?.roomCode || ""
        ).trim().toUpperCase();

      const playerToken =
        String(
          data?.playerToken || ""
        ).trim();

      const room =
        rooms.get(roomCode);

      if (
        !room ||
        !playerToken
      ) {
        return;
      }

      const oldSocketId =
        room.playerTokens[playerToken];

      if (
        oldSocketId &&
        oldSocketId !==
          socket.id
      ) {

        room.players =
          room.players.map(
            id =>
              id ===
                oldSocketId
                ? socket.id
                : id
          );

        if (
          io.sockets.sockets.has(
            oldSocketId
          )
        ) {
          const oldSocket =
            io.sockets.sockets.get(
              oldSocketId
            );

          if (
            oldSocket
          ) {
            oldSocket.disconnect(
              true
            );
          }
        }
      }

      if (
        !room.players.includes(
          socket.id
        )
      ) {

        if (
          room.players.length >=
          MAX_PLAYERS
        ) {
          return;
        }

        room.players.push(
          socket.id
        );
      }

      room.playerTokens[playerToken] =
        socket.id;

      socket.roomCode =
        roomCode;

      socket.playerToken =
        playerToken;

      if (
        playerToken ===
        room.hostToken
      ) {
        room.hostSocketId =
          socket.id;
      }

      socket.join(
        roomCode
      );

      room.lastActivityAt =
        Date.now();

      socket.emit(
        "roomState",
        {
          ...getRoomState(
            room
          ),
          isHost:
            playerToken ===
              room.hostToken
        }
      );

      if (
        Number(room.pendingNavigationLevel || 0) === 2 &&
        Number(room.currentLevel || 0) === 2 &&
        room.status === "playing"
      ) {
        socket.emit("navigateToLevel", {
          level: 2,
          currentPuzzle: room.currentPuzzle,
          currentQuestion: room.currentQuestion,
          timeRemaining: room.timeRemaining
        });
      }

      broadcastRoomState(
        roomCode
      );
    }
  );


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
          room.nextLevelPlayerTokens.length === 0) {
        room.nextLevelPlayerTokens = Object.keys(room.playerTokens);
      }

      if (socket.playerToken) {
        room.nextLevelReady[socket.playerToken] = true;
      }

      room.lastActivityAt = Date.now();
      broadcastRoomState(roomCode);
      startNextLevelIfReady(roomCode);

      console.log(
        "Jugador confirma continuación:",
        roomCode,
        "Nivel solicitado:",
        targetLevel,
        "Jugador:",
        socket.id
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
      
      room.questionPool =
        createQuestionPool();
      
      room.currentQuestion =
        room.questionPool.shift();

      room.currentQuestionResolved =
        false;


      room.puzzlesSolved =
        0;

      room.failCount =
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
    
        const solvedQuestion =
      Number(
        data?.question
      );
    
    if (
      solvedQuestion !==
      Number(
        room.currentQuestion
      )
    ) {
    
      console.log(
        "MULTIJUGADOR: acierto antiguo ignorado",
        {
          jugador:
            socket.id,
    
          recibido:
            solvedQuestion,
    
          actual:
            room.currentQuestion
        }
      );
    
      return;
    }

    if (
      room.status !==
      "playing"
    ) {
      return;
    }

    
    /*
     * No registrar dos veces
     * el mismo acertijo.
     */
    room.lastActivityAt = Date.now();

    if (
      room.currentQuestionResolved
    ) {
      return;
    }

    room.currentQuestionResolved =
        true;
      
      
      /*
       * Avisar a TODOS los jugadores
       * de la sala de que ha habido un acierto.
       */
      io.to(roomCode).emit(
        "puzzleSound",
        {
          type: "success"
        }
      );
      
      
      /*
       * El acierto pertenece a la sala,
       * no a cada jugador.
       */
      room.puzzlesSolved += 1;

      room.score =
        Math.max(
          0,
          room.score +
            POINTS_PER_SOLVED
        );

    console.log(
      "MULTIJUGADOR: ACIERTO REGISTRADO",
      {
        jugador: socket.id,
        acertijo: room.currentQuestion,
        total: room.puzzlesSolved
      }
    );

    /*
     * VICTORIA
     */
    if (
      room.puzzlesSolved >=
      room.totalPuzzles
    ) {
      room.puzzlesSolved =
        room.totalPuzzles;

      room.status =
        "victory";

      room.score =
        Math.max(
          0,
          room.score +
            ESCAPE_BONUS +
            Math.round(
              (
                Math.max(
                  0,
                  room.timeRemaining
                ) /
                GAME_DURATION
              ) *
              MAX_TIME_BONUS
            )
        );

      room.finalScore =
        room.score;

      if (!room.completedLevels.includes(room.currentLevel)) {
        room.completedLevels.push(room.currentLevel);
      }

      // Guardamos exactamente quiénes terminaron el nivel.
      // La transición no se abrirá hasta que esos mismos jugadores
      // hayan vuelto a conectarse en el siguiente nivel.
      room.nextLevelPlayerTokens = room.players
        .map(id => io.sockets.sockets.get(id)?.playerToken)
        .filter(Boolean);
      room.nextLevelReady = {};

      room.lastActivityAt = Date.now();

      room.bonusActive =
        false;

      room.bonusRemaining =
        0;

            broadcastRoomState(
        roomCode
      );

room.players.forEach(
        playerSocketId => {

          io.to(
            playerSocketId
          ).emit(
            "gameVictory",
            {
              puzzlesSolved:
                room.puzzlesSolved,

              totalPuzzles:
                room.totalPuzzles,

              timeRemaining:
                room.timeRemaining,

              score:
                room.finalScore ||
                room.score,

              hostToken:
                room.hostToken,

              isHost:
                (
                  io.sockets.sockets.get(
                    playerSocketId
                  )?.playerToken ||
                  ""
                ) ===
                  room.hostToken
            }
          );
        }
      );
      /*
       * La victoria solo muestra la pantalla final.
       * No navegamos al índice automáticamente.
       */
      room.returningToMain = false;
      room.lastActivityAt = Date.now();

      console.log(
        "MULTIJUGADOR: VICTORIA -> ESPERANDO AL ANFITRIÓN",
        roomCode
      );
} else {

      /*
       * Elegir UN nuevo acertijo.
       */
      room.currentPuzzle +=
        1;
      
      room.currentQuestion =
        room.questionPool.shift();

      room.failCount =
        0;

      room.questionStartedAt =
        Date.now();

      /*
       * MUY IMPORTANTE:
       * el nuevo acertijo todavía no está
       * resuelto.
       */
      room.currentQuestionResolved =
        false;
      
      room.bonusActive =
        true;
      
      room.bonusRemaining =
        PUZZLE_BONUS;

      console.log(
        "MULTIJUGADOR: NUEVO ACERTIJO",
        {
          puzzle: room.currentPuzzle,
          question: room.currentQuestion,
          bonus: room.bonusRemaining
        }
      );
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
      "Nuevo acertijo:",
      room.currentQuestion,
      "Pausa:",
      room.bonusRemaining
    );

  }
);

  // ------------------------------------------------
// FALLO DE ACERTIJO
// ------------------------------------------------

socket.on(
  "questionFailed",
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
     * Comprobar que el fallo pertenece
     * al acertijo que está actualmente
     * en la sala.
     */
    const failedQuestion =
      Number(
        data?.question
      );

    if (
      failedQuestion !==
      Number(
        room.currentQuestion
      )
    ) {

      console.log(
        "MULTIJUGADOR: fallo antiguo ignorado",
        {
          jugador:
            socket.id,

          recibido:
            failedQuestion,

          actual:
            room.currentQuestion
        }
      );

      return;
    }

    /*
     * Avisar a TODOS los jugadores
     * de la sala del fallo.
     */
    io.to(roomCode).emit(
      "puzzleSound",
      {
        type: "fail"
      }
    );


/*
 * Contar el fallo para toda la sala.
 */
room.failCount +=
  1;

    room.score =
      Math.max(
        0,
        room.score -
          POINTS_PER_FAIL
      );


    /*
     * Contar el fallo para toda la sala.
     */
    


    console.log(
      "MULTIJUGADOR: FALLO",
      {
        jugador:
          socket.id,

        acertijo:
          room.currentQuestion,

        fallos:
          room.failCount,

        max:
          3
      }
    );


    /*
     * Todavía quedan intentos.
     */
    if (
      room.failCount <
      3
    ) {

      broadcastRoomState(
        roomCode
      );

      return;
    }


    /*
     * Tres fallos:
     * abandonar el acertijo actual
     * para toda la sala.
     */

    room.currentPuzzle +=
      1;

    room.currentQuestion =
      room.questionPool.shift();

    room.currentQuestionResolved =
      false;

    room.failCount =
      0;

    room.questionStartedAt =
      Date.now();


    /*
     * No hay bonificación por fallo.
     */
    room.bonusActive =
      false;

    room.bonusRemaining =
      0;


    console.log(
      "MULTIJUGADOR: TRES FALLOS, NUEVO ACERTIJO",
      {
        puzzle:
          room.currentPuzzle,

        question:
          room.currentQuestion
      }
    );


    broadcastRoomState(
      roomCode
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

      if (
        !roomCode
      ) {
        return;
      }

      const room =
        rooms.get(
          roomCode
        );

      if (
        !room
      ) {
        return;
      }

      /*
       * No borramos el asiento lógico del jugador al cambiar
       * de página. El siguiente resumeMainRoom/resumeRoom
       * sustituirá el socket antiguo por el nuevo.
       */
      room.lastActivityAt =
        Date.now();

      console.log(
        "Jugador desconectado; asiento conservado:",
        socket.id,
        "Sala:",
        roomCode
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
        room.players.length === 0 &&
        Date.now() - room.lastActivityAt > ROOM_IDLE_TIMEOUT
      ) {
        rooms.delete(roomCode);
        console.log("Sala caducada:", roomCode);
        continue;
      }

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
