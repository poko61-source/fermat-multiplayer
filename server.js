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
// TRANSICIÓN SINCRONIZADA AL SIGUIENTE NIVEL
// --------------------------------------------------

function startNextLevelIfReady(roomCode) {
  const room = rooms.get(roomCode);

  if (!room) {
    return;
  }

  if (!Array.isArray(room.nextLevelPlayerTokens)) {
    room.nextLevelPlayerTokens = [];
  }

  if (
    !room.nextLevelReady ||
    typeof room.nextLevelReady !== "object"
  ) {
    room.nextLevelReady = {};
  }

  if (room.status !== "victory") {
    return;
  }

  const expected =
    room.nextLevelPlayerTokens.filter(Boolean);

  if (!expected.length) {
    return;
  }

  const allReady =
    expected.every(
      token =>
        room.nextLevelReady[token] === true
    );

  if (!allReady) {
    broadcastRoomState(roomCode);
    return;
  }

  room.currentLevel += 1;
  room.status = "playing";
  room.currentPuzzle = 1;
  room.questionPool = createQuestionPool();
  room.currentQuestion =
    room.questionPool.shift();
  room.currentQuestionResolved = false;
  room.puzzlesSolved = 0;
  room.failCount = 0;
  room.timeRemaining = GAME_DURATION;
  room.bonusActive = false;
  room.bonusRemaining = 0;
  room.questionStartedAt = Date.now();
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
    (data = {}) => {

      const code =
        String(data?.roomCode || data || "")
          .trim()
          .toUpperCase();

      const playerToken =
        String(data?.playerToken || "").trim();

      if (!playerToken) {
        socket.emit("roomError", "Identidad de jugador no válida.");
        return;
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


      socket.join(
        code
      );


      room.players.push(
        socket.id
      );

      room.playerTokens[playerToken] = socket.id;
      room.lastActivityAt = Date.now();

      socket.roomCode =
        code;
      socket.playerToken =
        playerToken;


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
  // REANUDAR PARTIDA TRAS CAMBIO DE PÁGINA
  // ------------------------------------------------

  socket.on(
    "resumeRoom",
    (data = {}) => {
      const roomCode =
        String(data?.roomCode || "")
          .trim()
          .toUpperCase();

      const playerToken =
        String(data?.playerToken || "").trim();

      const room =
        rooms.get(roomCode);

      if (!room || !playerToken) {
        socket.emit(
          "roomError",
          "No se puede reanudar la partida."
        );
        return;
      }

      /*
       * playerToken identifica al jugador de forma persistente.
       * socket.id cambia al cambiar de página.
       */
      const previousSocketId =
        room.playerTokens[playerToken];

      if (
        previousSocketId &&
        previousSocketId !== socket.id
      ) {
        room.players =
          room.players.filter(
            id => id !== previousSocketId
          );
      }

      if (!room.players.includes(socket.id)) {
        if (room.players.length >= MAX_PLAYERS) {
          socket.emit(
            "roomError",
            "La sala está llena."
          );
          return;
        }

        room.players.push(socket.id);
      }

      room.playerTokens[playerToken] =
        socket.id;

      room.lastActivityAt =
        Date.now();

      socket.roomCode =
        roomCode;

      socket.playerToken =
        playerToken;

      socket.join(roomCode);

      /*
       * Si esta página corresponde al siguiente nivel,
       * este jugador queda marcado como preparado.
       */
      const targetLevel =
        Number(data?.targetLevel);

      if (
        room.status === "victory" &&
        Number.isInteger(targetLevel) &&
        targetLevel === room.currentLevel + 1
      ) {
        if (
          !Array.isArray(room.nextLevelPlayerTokens) ||
          room.nextLevelPlayerTokens.length === 0
        ) {
          room.nextLevelPlayerTokens =
            Object.keys(room.playerTokens);
        }

        room.nextLevelReady =
          room.nextLevelReady || {};

        room.nextLevelReady[playerToken] =
          true;

        console.log(
          "Jugador listo para siguiente nivel:",
          roomCode,
          playerToken,
          "Listos:",
          Object.keys(room.nextLevelReady)
            .filter(
              token =>
                room.nextLevelReady[token] === true
            ).length,
          "/",
          room.nextLevelPlayerTokens.length
        );
      }

      // Entregar el estado inmediatamente a este jugador.
      socket.emit(
        "roomState",
        getRoomState(room)
      );

      broadcastRoomState(
        roomCode
      );

      startNextLevelIfReady(
        roomCode
      );

      console.log(
        "Partida reanudada:",
        roomCode,
        "Nivel:",
        room.currentLevel,
        "Jugador:",
        socket.id,
        "Token:",
        playerToken
      );
    }
  );


  // ------------------------------------------------
  // CONTINUAR AL SIGUIENTE NIVEL
  // ------------------------------------------------

  socket.on(
    "continueLevel",
    (data = {}) => {
      const roomCode =
        socket.roomCode;

      const room =
        rooms.get(roomCode);

      const targetLevel =
        Number(data?.targetLevel);

      if (!room || !Number.isInteger(targetLevel)) {
        return;
      }

      if (
        targetLevel !==
        room.currentLevel + 1
      ) {
        return;
      }

      if (
        !room.completedLevels.includes(
          room.currentLevel
        )
      ) {
        return;
      }

      if (
        room.status !== "victory"
      ) {
        return;
      }

      /*
       * Compatibilidad con el cliente actual:
       * continueLevel NO inicia el siguiente nivel.
       * Solo registra que este jugador ha confirmado
       * que va a continuar.
       */
      if (
        !Array.isArray(
          room.nextLevelPlayerTokens
        ) ||
        room.nextLevelPlayerTokens.length === 0
      ) {
        room.nextLevelPlayerTokens =
          Object.keys(
            room.playerTokens
          );
      }

      if (socket.playerToken) {
        room.nextLevelReady =
          room.nextLevelReady || {};

        room.nextLevelReady[
          socket.playerToken
        ] = true;
      }

      room.lastActivityAt =
        Date.now();

      broadcastRoomState(
        roomCode
      );

      startNextLevelIfReady(
        roomCode
      );

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

      if (!room.completedLevels.includes(room.currentLevel)) {
        if (!room.completedLevels.includes(room.currentLevel)) {
        room.completedLevels.push(room.currentLevel);
      }

      // Guardar por playerToken quiénes deben reaparecer en el siguiente nivel.
      room.nextLevelPlayerTokens =
        Object.keys(
          room.playerTokens
        );

      room.nextLevelReady = {};

      room.lastActivityAt = Date.now();

      room.bonusActive =
        false;

      room.bonusRemaining =
        0;

      io.to(roomCode).emit(
        "gameVictory",
        {
          puzzlesSolved:
            room.puzzlesSolved,
      
          totalPuzzles:
            room.totalPuzzles
        }
      );

      console.log(
        "MULTIJUGADOR: VICTORIA",
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


    /*
     * Contar el fallo para toda la sala.
     */
    room.failCount +=
      1;


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
      const roomCode = socket.roomCode;
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      room.players = room.players.filter(
        (id) => id !== socket.id
      );

      room.lastActivityAt = Date.now();

      broadcastRoomState(roomCode);

      console.log(
        "Jugador desconectado, sala conservada:",
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
