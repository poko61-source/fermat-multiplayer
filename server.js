<!DOCTYPE html>
<html lang="es">

<head>

  <meta charset="UTF-8">

  <link
    rel="icon"
    href="favicon.ico"
    type="image/x-icon"
  >

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>La habitación de Fermat</title>


  <div
      id="mainPlayerCount"
      style="
        text-align: center;
        margin: 10px 0 18px;
        padding: 6px 0;
        font-family: monospace;
        letter-spacing: 2px;
        color: #9fc1ca;
      "
    >JUGADORES: 0 / 4</div>

    <style>

    :root {

      --bg:
        #0a1019;

      --bg-2:
        #0c1522;

      --panel:
        #142231;

      --panel-soft:
        rgba(20, 34, 49, .94);

      --line:
        #2b3d56;

      --line-soft:
        rgba(77, 214, 197, .28);

      --accent:
        #4dd6c5;

      --accent-light:
        #eef4ff;

      --accent-dark:
        #35557d;

      --text:
        #eef4ff;

      --muted:
        #a8b8cc;

      --green:
        #21434a;

      --green-light:
        #4dd6c5;

      --red:
        #703021;

      --red-light:
        #a9472f;

      --locked:
        #667588;

      --shadow:
        rgba(0, 0, 0, .38);
    }


    * {
      box-sizing:
        border-box;
    }


    html,
    body {

      margin:
        0;

      min-height:
        100%;
    }


    body {

      min-height:
        100vh;

      color:
        var(--text);

      font-family:
        Georgia,
        "Times New Roman",
        serif;

      background:

        radial-gradient(
          ellipse at 50% -10%,
          #30495a 0%,
          #1d3443 30%,
          #10212d 62%,
          #0a1019 100%
        );

      overflow-x:
        hidden;
    }


    body::before {

      content:
        "";

      position:
        fixed;

      inset:
        0;

      pointer-events:
        none;

      background:

        repeating-linear-gradient(
          90deg,
          rgba(255,255,255,.012) 0,
          rgba(255,255,255,.012) 1px,
          transparent 1px,
          transparent 120px
        );

      opacity:
        .18;
    }


    /* =========================================================
       MARCO GENERAL
       ========================================================= */

    .frame {

      width:
        min(1180px, calc(100% - 24px));

      margin:
        12px auto;

      min-height:
        calc(100vh - 24px);

      position:
        relative;

      padding:
        26px 24px 22px;

      border:
        1px solid
        rgba(77, 214, 197, .30);

      background:

        linear-gradient(
          180deg,
          rgba(18, 34, 47, .96),
          rgba(11, 22, 31, .97)
        );

      box-shadow:
        0 24px 70px
        rgba(0,0,0,.38);
    }


    .frame::before,
    .frame::after {

      content:
        "";

      position:
        absolute;

      width:
        18px;

      height:
        18px;

      border:
        1px solid
        var(--accent-dark);

      opacity:
        .85;
    }


    .frame::before {

      top:
        9px;

      left:
        9px;

      border-right:
        0;

      border-bottom:
        0;
    }


    .frame::after {

      right:
        9px;

      bottom:
        9px;

      border-left:
        0;

      border-top:
        0;
    }


    /* =========================================================
       CABECERA
       ========================================================= */

    .hero {

      max-width:
        860px;

      margin:
        0 auto 22px;

      text-align:
        center;
    }


    .title {

      margin:
        0;

      color:
        var(--text);

      font-size:
        clamp(
          24px,
          3.6vw,
          42px
        );

      line-height:
        .96;

      font-weight:
        700;

      letter-spacing:
        .035em;

      text-shadow:
        0 3px 10px
        rgba(0,0,0,.55);
    }


    .title-line {

      width:
        min(360px, 65%);

      height:
        1px;

      margin:
        16px auto 14px;

      background:
        linear-gradient(
          90deg,
          transparent,
          var(--red-light),
          transparent
        );
    }


    .subtitle {

      max-width:
        720px;

      margin:
        0 auto;

      color:
        #d9e4ed;

      font-size:
        clamp(
          14px,
          1.6vw,
          17px
        );

      line-height:
        1.42;

      font-style:
        italic;
		
	  text-shadow:
		0 2px 5px
		rgba(0,0,0,.55);
    }


    /* =========================================================
       ESCENA
       ========================================================= */

    .scene {

      width:
        min(1000px, 100%);

      height:
        215px;

      margin:
        0 auto 16px;

      position:
        relative;

      overflow:
        hidden;

      border:
        1px solid
        var(--line-soft);

      background:

        radial-gradient(
          ellipse at 18% 48%,
          rgba(53, 103, 90, .48),
          transparent 42%
        ),

        radial-gradient(
          ellipse at 77% 44%,
          rgba(57, 83, 96, .42),
          transparent 40%
        ),

        linear-gradient(
          180deg,
          #152a38,
          #0c1922
        );

      box-shadow:
        inset 0 0 45px
        rgba(0,0,0,.28);
    }


    .scene-wall {

      position:
        absolute;

      inset:
        0;

      background:

        linear-gradient(
          90deg,
          rgba(0,0,0,.20),
          transparent 20%,
          transparent 80%,
          rgba(0,0,0,.28)
        );
    }


    .lamp {

      position:
        absolute;

      width:
        84px;

      height:
        84px;

      border-radius:
        50%;

      filter:
        blur(4px);

      opacity:
        .36;

      background:
        radial-gradient(
          circle,
          #f1d79b 0,
          rgba(231,190,111,.45) 25%,
          transparent 68%
        );
    }


    .lamp.left {

      left:
        5%;

      top:
        20%;
    }


    .lamp.right {

      right:
        5%;

      top:
        22%;
    }


    /* =========================================================
       PIZARRA - CONJETURA DE GOLDBACH
       ========================================================= */

    .blackboard {

      position:
        absolute;

      right:
        5%;

      top:
        5%;

      width:
        min(345px, 36%);

      height:
        174px;

      padding:
        18px 20px;

      border:
        6px solid
        #293028;

      background:
        #17251f;

      box-shadow:
        0 12px 28px
        rgba(0,0,0,.35);

      transform:
        rotateY(-3deg);
    }


    .blackboard-title {

      margin-bottom:
        10px;

      color:
        #dce7d8;

      font-size:
        15px;

      font-weight:
        700;

      letter-spacing:
        .05em;

      text-transform:
        uppercase;

      transform:
        rotate(-1deg);
    }


    .chalk {

      color:
        rgba(225, 235, 222, .82);

      font-family:
        "Comic Sans MS",
        "Segoe Print",
        "Bradley Hand",
        cursive;

      font-size:
        14px;

      line-height:
        1.32;

      transform:
        rotate(-1deg);
    }


    .chalk.examples {

      margin-top:
        7px;

      font-size:
        13px;

      opacity:
        .86;
    }


    /* =========================================================
       ESCRITORIO
       ========================================================= */

    .desk {

      position:
        absolute;

      left:
        50%;

      bottom:
        -50px;

      transform:
        translateX(-50%);

      width:
        82%;

      height:
        112px;

      background:

        linear-gradient(
          180deg,
          #4b3421,
          #2b1d13
        );

      border:
        1px solid
        #65472e;

      box-shadow:
        0 -6px 24px
        rgba(0,0,0,.34);
    }


    /* =========================================================
       NOTA ESCRITA A MÁQUINA
       ========================================================= */

    .typewriter-paper {

      position:
        absolute;

      left:
        18%;

      top:
        -12px;

      width:
        210px;

      height:
        82px;

      padding:
        20px 16px 12px;

      background:
        #d8cfb3;

      color:
        #2c302d;

      transform:
        rotate(-4deg);

      box-shadow:
        0 7px 16px
        rgba(0,0,0,.35);

      font-family:
        "Courier New",
        Courier,
        monospace;

      font-size:
        12px;

      letter-spacing:
        .05em;

      text-align:
        left;
    }


    .typewriter-paper::before {

      content:
        "";

      position:
        absolute;

      left:
        0;

      right:
        0;

      top:
        0;

      height:
        8px;

      background:
        #eee5c8;

      opacity:
        .65;
    }


    .typewriter-paper span {

      display:
        inline-block;

      margin-top:
        5px;

      border-bottom:
        1px solid
        rgba(44,48,45,.55);

      padding-bottom:
        3px;
    }



    /* =========================================================
       TEMPORIZADOR
       ========================================================= */

    .timer {

      position:
        absolute;

      right:
        17%;

      top:
        8px;

      width:
        150px;

      padding:
        9px 13px;

      border:
        1px solid
        #56614d;

      background:
        #19241d;

      color:
        #bfd29c;

      font-family:
        "Courier New",
        monospace;

      box-shadow:
        inset 0 0 10px
        rgba(0,0,0,.45);

      transform:
        rotate(2deg);

      z-index:
        4;
    }


    .timer small {

      display:
        block;

      margin-bottom:
        2px;

      color:
        #8fa274;

      font-size:
        9px;

      letter-spacing:
        .12em;
    }


    .timer strong {

      display:
        block;

      font-size:
        27px;

      letter-spacing:
        .08em;
    }


    /*
     * Mancha de sangre irregular
     * superpuesta al temporizador.
     */

    .blood-stain {

      position:
        absolute;

      left:
        -240px;

      top:
        20px;

      width:
        68px;

      height:
        38px;

      z-index:
        8;

      transform:
        rotate(-13deg);

      opacity:
        .85;

      filter:
        drop-shadow(
          0 2px 2px
          rgba(0,0,0,.32)
        );

      background:

        radial-gradient(
          ellipse at 24% 40%,
          #a9281e 0,
          #7f1d17 35%,
          transparent 36%
        ),

        radial-gradient(
          ellipse at 58% 34%,
          #b63124 0,
          #841c17 31%,
          transparent 32%
        ),

        radial-gradient(
          ellipse at 75% 66%,
          #9e241b 0,
          #7b1814 27%,
          transparent 28%
        );

      clip-path:
        polygon(
          2% 40%,
          12% 18%,
          28% 24%,
          39% 8%,
          54% 20%,
          69% 7%,
          82% 22%,
          98% 17%,
          92% 46%,
          98% 64%,
          80% 68%,
          71% 92%,
          52% 70%,
          38% 88%,
          28% 66%,
          10% 72%
        );
    }


    .blood-drop-1,
    .blood-drop-2,
    .blood-drop-3 {

      position:
        absolute;

      z-index:
        7;

      border-radius:
        50%;

      background:
        #7f241c;

      box-shadow:
        0 1px 2px
        rgba(0,0,0,.35);
    }


    .blood-drop-1 {

      width:
        9px;

      height:
        13px;

      left:
        -210px;

      top:
        50px;
    }


    .blood-drop-2 {

      width:
        6px;

      height:
        8px;

      left:
        -225px;

      top:
        50px;
    }


    .blood-drop-3 {

      width:
        4px;

      height:
        6px;

      left:
        -230px;

      top:
        25px;
    }


    /* =========================================================
       EXPEDIENTES
       ========================================================= */

    .levels-title {

      margin:
        0 0 14px;

      text-align:
        center;

      color:
        var(--accent);

      font-size:
        14px;

      letter-spacing:
        .20em;

      text-transform:
        uppercase;
    }


    .levels {

      width:
        min(1000px, 100%);

      margin:
        0 auto;

      display:
        grid;

      grid-template-columns:
        repeat(
          5,
          minmax(0, 1fr)
        );

      gap:
        10px;
    }


    .level {

      min-height:
        170px;

      padding:
        14px 12px 12px;

      position:
        relative;

      display:
        flex;

      flex-direction:
        column;

      justify-content:
        space-between;

      border:
        1px solid
        var(--line);

      background:
        linear-gradient(
          180deg,
          rgba(20, 34, 49, .97),
          rgba(11, 22, 31, .98)
        );

      box-shadow:
        0 10px 20px
        rgba(0,0,0,.24);
    }


    .level.available {

      border-color:
        rgba(77,214,197,.65);

      cursor:
        pointer;

      transition:
        transform .18s ease,
        border-color .18s ease,
        box-shadow .18s ease;
    }


    .level.available:hover {

      transform:
        translateY(-3px);

      border-color:
        var(--accent);

      box-shadow:
        0 16px 28px
        rgba(0,0,0,.36),
        0 0 20px
        rgba(77,214,197,.10);
    }


    .level.locked {

      opacity:
        .48;

      filter:
        saturate(.65);
    }


    .dossier {

      color:
        var(--accent);

      font-size:
        9px;

      letter-spacing:
        .18em;

      text-transform:
        uppercase;
    }


    .level-number {

      margin:
        5px 0 8px;

      color:
        var(--accent-light);

      font-size:
        31px;

      line-height:
        1;

      font-weight:
        700;
    }


    .level-name {

      min-height:
        34px;

      color:
        var(--text);

      font-size:
        13px;

      line-height:
        1.16;

      letter-spacing:
        .045em;

      text-transform:
        uppercase;
    }


    .level-status {

      margin-top:
        6px;

      color:
        var(--muted);

      font-size:
        10px;

      line-height:
        1.3;
    }


    .level-symbol {

      width:
        34px;

      height:
        34px;

      margin:
        8px auto;

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      border:
        1px solid
        var(--accent-dark);

      border-radius:
        50%;

      color:
        var(--accent);

      font-size:
        18px;
    }


    .level-button {

      width:
        100%;

      height:
        34px;

      border:
        1px solid
        var(--accent-dark);

      background:
        linear-gradient(
          145deg,
          #21434a,
          #173139
        );

      color:
        var(--text);

      font-family:
        inherit;

      font-size:
        10px;

      letter-spacing:
        .12em;

      text-transform:
        uppercase;

      cursor:
        pointer;
    }


    .level-button:hover {

      border-color:
        var(--accent);
    }


    .level-button.locked {

      border-color:
        #455568;

      background:
        #16202b;

      color:
        #778699;

      cursor:
        not-allowed;
    }


    /* =========================================================
       PIE / AGRADECIMIENTO
       ========================================================= */

    .quote {

      width:
        min(760px, 100%);

      margin:
        24px auto 0;

      text-align:
        center;

      color:
        var(--muted);

      font-size:
        12px;

      letter-spacing:
        .12em;

      text-transform:
        uppercase;
    }


    .producer {

      margin:
        20px auto 0;

      display:
        flex;

      flex-direction:
        column;

      align-items:
        center;

      gap:
        8px;

      color:
        #8f9dad;

      font-size:
        11px;

      text-align:
        center;
    }


    .producer img {

      display:
        block;

      width:
        auto;

      max-width:
        150px;

      max-height:
        52px;

      object-fit:
        contain;

      opacity:
        .90;
    }
	


    /* =========================================================
       RESPONSIVE
       ========================================================= */

    @media (
      max-width: 1050px
    ) {

      .levels {

        grid-template-columns:
          repeat(
            4,
            minmax(0, 1fr)
          );
      }
    }


    @media (
      max-width: 820px
    ) {

      .frame {

        width:
          calc(100% - 14px);

        margin:
          7px auto;

        min-height:
          calc(100vh - 14px);

        padding:
          22px 16px 18px;
      }


      .scene {

        height:
          205px;
      }


      .blackboard {

        width:
          40%;

        height:
          150px;

        padding:
          14px 15px;
      }


      .desk {

        width:
          94%;
      }


      .levels {

        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );
      }
    }


    @media (
      max-width: 560px
    ) {

      body {
        background:
          #0a1019;
      }


      .frame {

        width:
          100%;

        margin:
          0;

        border:
          0;

        padding:
          20px 10px 16px;
      }


      .title {

	  margin:
		0;

	  color:
		var(--text);

	  font-size:
		clamp(
		  34px,
		  5.2vw,
		  62px
		);

	  line-height:
		.96;

	  font-weight:
		700;

	  letter-spacing:
		.035em;

	  text-shadow:
		0 3px 10px
		rgba(0,0,0,.55);
	}


      .blackboard-title {

        font-size:
          10px;
      }


      .chalk {

        font-size:
          10px;
      }


      .chalk.examples {

        font-size:
          9px;
      }


      .typewriter-paper {

        left:
          7%;

        width:
          155px;

        height:
          68px;

        padding:
          16px 10px 10px;

        font-size:
          15px;
      }


      .notebook {

        left:
          38%;

        width:
          82px;

        height:
          66px;
      }


      .timer {

        right:
          6%;

        width:
          116px;

        padding:
          7px 9px;
      }


      .timer strong {

        font-size:
          20px;
      }


      .blood-stain {

        left:
          9px;

        width:
          55px;

        height:
          32px;
      }


      .blood-drop-1 {

        left:
          31px;
      }


      .blood-drop-2 {

        left:
          7px;
      }


      .blood-drop-3 {

        left:
          58px;
      }


      .levels {

        grid-template-columns:
          1fr 1fr;

        gap:
          8px;
      }


      .level {

        min-height:
          170px;

        padding:
          12px 10px 10px;
      }


      .level-number {

        font-size:
          27px;
      }


      .level-name {

        font-size:
          12px;
      }
	  


      .level-symbol {

        width:
          30px;

        height:
          30px;

        font-size:
          16px;
      }
	  
	  


      .producer img {

        max-width:
          125px;

        max-height:
          44px;
      }

    }
	
	.music-credit {

	  margin-top:
		4px;

	  color:
		var(--muted);

	  font-size:
		10px;

	  letter-spacing:
		.08em;
	}


    @media (
      max-width: 390px
    ) {

      .levels {

        grid-template-columns:
          1fr;
      }

    }

  </style>

</head>


<body>

  <audio
    id="backgroundMusic"
    autoplay
    loop
    preload="auto"
  >
    <source
      src="B S O-La Habitacion de Fermat-isaac-2.ogg"
      type="audio/ogg"
    >
  </audio>
  
  
  <main class="frame">
  
  

    <!-- =======================================================
         CABECERA
         ======================================================= -->

    <header class="hero">

      <h1 class="title">
        LA HABITACIÓN DE FERMAT
      </h1>


      <div class="title-line"></div>


      <p class="subtitle">
        Una habitación. Cinco acertijos. Diez minutos que esperan tu extinción.
      </p>

    </header>


    <!-- =======================================================
         ESCENA
         ======================================================= -->

    <section class="scene">

      <div class="scene-wall"></div>


      <div class="lamp left"></div>

      <div class="lamp right"></div>


      <!-- PIZARRA -->

      <div class="blackboard">

        <div class="blackboard-title">
          Conjetura de Goldbach
        </div>


        <div class="chalk">

          Todo número par mayor que 2
          puede expresarse como suma
          de dos números primos.

        </div>


        <div class="chalk examples">

          4 = 2 + 2; &nbsp; &nbsp; &nbsp;   6 = 3 + 3; &nbsp; &nbsp; &nbsp;    8 = 3 + 5
          <br>
          10 = 3 + 7; &nbsp; &nbsp;   12 = 5 + 7; &nbsp; &nbsp;   14 = 7 + 7

        </div>

      </div>


      <!-- ESCRITORIO -->

      <div class="desk">


        <!-- NOTA MECANOGRAFIADA -->

        <div class="typewriter-paper">
          <span>Se hace llamar Fermat, su nombre real es</span>
        </div>


        

        <!-- TEMPORIZADOR -->

        <div class="timer">

          <div class="blood-stain"></div>

          <div class="blood-drop-1"></div>
          <div class="blood-drop-2"></div>
          <div class="blood-drop-3"></div>


          <small>
            TIEMPO LÍMITE
          </small>

          <strong>
            10:00
          </strong>

        </div>

      </div>

    </section>


    <!-- =======================================================
         NIVELES
         ======================================================= -->

    <div class="levels-title">
      Expedientes
    </div>


    <section
      class="levels"
      aria-label="Niveles del juego"
    >


      <!-- NIVEL 1 -->

      <article class="level available">

        <div>

          <div class="dossier">
            Expediente 01
          </div>


          <div class="level-number">
            01
          </div>


          <div class="level-name">
            La primera habitación
          </div>


          <div class="level-status">
            Disponible
          </div>

        </div>


        <div class="level-symbol">
          ◇
        </div>


        <button
          class="level-button"
          type="button"
          onclick="goToLevel(1)"
        >
          Entrar
        </button>

      </article>


      <!-- NIVEL 2 -->

      <article id="level2Card" class="level locked">

        <div>

          <div class="dossier">
            Expediente 02
          </div>


          <div class="level-number">
            02
          </div>


          <div class="level-name">
            Desafío pendiente
          </div>


          <div id="level2Status" class="level-status">
            Completa el expediente 01
          </div>

        </div>


        <div class="level-symbol">
          ♙
        </div>


        <button
          id="level2Button"
          class="level-button locked"
          type="button"
          disabled
        >
          Bloqueado
        </button>

      </article>


      <!-- NIVEL 3 -->

      <article class="level locked">

        <div>

          <div class="dossier">
            Expediente 03
          </div>


          <div class="level-number">
            03
          </div>


          <div class="level-name">
            Desafío pendiente
          </div>


          <div class="level-status">
            Completa los anteriores
          </div>

        </div>


        <div class="level-symbol">
          π
        </div>


        <button
          class="level-button locked"
          type="button"
          disabled
        >
          Bloqueado
        </button>

      </article>


      <!-- NIVEL 4 -->

      <article class="level locked">

        <div>

          <div class="dossier">
            Expediente 04
          </div>


          <div class="level-number">
            04
          </div>


          <div class="level-name">
            Desafío pendiente
          </div>


          <div class="level-status">
            Completa los anteriores
          </div>

        </div>


        <div class="level-symbol">
          ∞
        </div>


        <button
          class="level-button locked"
          type="button"
          disabled
        >
          Bloqueado
        </button>

      </article>


      <!-- NIVEL 5 -->

      <article class="level locked">

        <div>

          <div class="dossier">
            Expediente 05
          </div>


          <div class="level-number">
            05
          </div>


          <div class="level-name">
            Desafío pendiente
          </div>


          <div class="level-status">
            Completa los anteriores
          </div>

        </div>


        <div class="level-symbol">
          Σ
        </div>


        <button
          class="level-button locked"
          type="button"
          disabled
        >
          Bloqueado
        </button>

      </article>


      <!-- NIVEL 6 -->

      <article class="level locked">

        <div>

          <div class="dossier">
            Expediente 06
          </div>


          <div class="level-number">
            06
          </div>


          <div class="level-name">
            Desafío pendiente
          </div>


          <div class="level-status">
            Completa los anteriores
          </div>

        </div>


        <div class="level-symbol">
          ⌁
        </div>


        <button
          class="level-button locked"
          type="button"
          disabled
        >
          Bloqueado
        </button>

      </article>


      <!-- NIVEL 7 -->

      <article class="level locked">

        <div>

          <div class="dossier">
            Expediente 07
          </div>


          <div class="level-number">
            07
          </div>


          <div class="level-name">
            Desafío pendiente
          </div>


          <div class="level-status">
            Completa los anteriores
          </div>

        </div>


        <div class="level-symbol">
          √
        </div>


        <button
          class="level-button locked"
          type="button"
          disabled
        >
          Bloqueado
        </button>

      </article>


      <!-- NIVEL 8 -->

      <article class="level locked">

        <div>

          <div class="dossier">
            Expediente 08
          </div>


          <div class="level-number">
            08
          </div>


          <div class="level-name">
            Desafío pendiente
          </div>


          <div class="level-status">
            Completa los anteriores
          </div>

        </div>


        <div class="level-symbol">
          Δ
        </div>


        <button
          class="level-button locked"
          type="button"
          disabled
        >
          Bloqueado
        </button>

      </article>


      <!-- NIVEL 9 -->

      <article class="level locked">

        <div>

          <div class="dossier">
            Expediente 09
          </div>


          <div class="level-number">
            09
          </div>


          <div class="level-name">
            Desafío pendiente
          </div>


          <div class="level-status">
            Completa los anteriores
          </div>

        </div>


        <div class="level-symbol">
          φ
        </div>


        <button
          class="level-button locked"
          type="button"
          disabled
        >
          Bloqueado
        </button>

      </article>


      <!-- NIVEL 10 -->

      <article class="level locked">

        <div>

          <div class="dossier">
            Expediente 10
          </div>


          <div class="level-number">
            10
          </div>


          <div class="level-name">
            Desafío final
          </div>


          <div class="level-status">
            Completa todos los anteriores
          </div>

        </div>


        <div class="level-symbol">
          ⌁
        </div>


        <button
          class="level-button locked"
          type="button"
          disabled
        >
          Bloqueado
        </button>

      </article>


    </section>


    <div class="quote">
     
    </div>


    <!-- =======================================================
         AGRADECIMIENTO A LA PRODUCTORA
         ======================================================= -->

    <footer class="producer">
	
	  
      <div>
        Con el agradecimiento a la productora
      <a
	    href="https://vertice360.com/es/ficha/0/la-habitacion-de-fermat"
	    target="_blank"
	    rel="noopener noreferrer"
	  >
	    <img
		  src="vertice360.png"
		  alt="Vértice 360"
	    >
	  </a>
	  
	  <div class="music-credit">
		Música: Isaac Sesmero
	  </div>

    </footer>


  </main>


  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>

  <script>

    const MAIN_MULTIPLAYER_SERVER =
      "https://fermat-multiplayer.onrender.com";

    let mainSocket = null;
    let mainConnected = false;
    let mainRoomCode =
      localStorage.getItem(
        "fermatRoomCode"
      );
    let mainPlayerToken =
      localStorage.getItem(
        "fermatPlayerToken"
      );
    let mainHostToken =
      localStorage.getItem(
        "fermatHostToken"
      );

    const mainArrivedAfterLevel1 =
      new URLSearchParams(
        window.location.search
      ).get(
        "completed"
      ) === "1";

    if (
      mainArrivedAfterLevel1
    ) {
      localStorage.setItem(
        "fermatCompletedLevels",
        JSON.stringify([1])
      );
    }


    function connectMainRoom() {

      const localRoomCode =
        localStorage.getItem(
          "fermatRoomCode"
        );

      const localIsHost =
        localStorage.getItem(
          "fermatIsHost"
        ) === "1";

      if (
        localRoomCode &&
        localIsHost
      ) {
        updateMainPlayerCount({
          players: 1
        });
      }

      const roomCode =
        localStorage.getItem(
          "fermatRoomCode"
        );

      let playerToken =
        localStorage.getItem(
          "fermatPlayerToken"
        );

      if (
        !roomCode ||
        !playerToken ||
        typeof io !==
          "function"
      ) {
        return;
      }

      mainRoomCode =
        roomCode;

      mainPlayerToken =
        playerToken;

      mainSocket =
        io(
          MAIN_MULTIPLAYER_SERVER,
          {
            transports: [
              "websocket",
              "polling"
            ],
            reconnection: true
          }
        );

      mainSocket.on(
        "connect",
        () => {

          mainConnected =
            true;

          mainSocket.emit(
            "resumeMainRoom",
            {
              roomCode:
                mainRoomCode,
              playerToken:
                mainPlayerToken,
              isHost:
                localStorage.getItem(
                  "fermatIsHost"
                ) === "1"
            }
          );
        }
      );

      mainSocket.on(
        "mainRoomReady",
        data => {

          if (
            data?.playerToken
          ) {
            mainPlayerToken =
              data.playerToken;

            localStorage.setItem(
              "fermatPlayerToken",
              data.playerToken
            );
          }

          if (
            data?.hostToken
          ) {
            mainHostToken =
              data.hostToken;

            localStorage.setItem(
              "fermatHostToken",
              data.hostToken
            );
          }

          updateMainPlayerCount(
            data
          );

          mainServerIsHost =
            data.isHost === true;

          updateMainPlayerCount(
            data
          );

          bindAuthoritativeLevel2Button(
            data
          );
        }
      );

      mainSocket.on(
        "roomState",
        serverState => {

          mainHostToken =
            serverState.hostToken ||
            mainHostToken ||
            null;

          if (
            mainHostToken
          ) {
            localStorage.setItem(
              "fermatHostToken",
              mainHostToken
            );
          }

          updateMainPlayerCount(
            serverState
          );

          mainServerIsHost =
            serverState.isHost === true;

          updateMainPlayerCount(
            serverState
          );

          bindAuthoritativeLevel2Button(
            serverState
          );
        }
      );

      mainSocket.on(
        "playerTokenReassigned",
        data => {

          if (
            data?.playerToken
          ) {

            mainPlayerToken =
              data.playerToken;

            localStorage.setItem(
              "fermatPlayerToken",
              data.playerToken
            );
          }

          if (
            data?.hostToken
          ) {

            mainHostToken =
              data.hostToken;

            localStorage.setItem(
              "fermatHostToken",
              data.hostToken
            );
          }

          updateMainLevel2Button();
        }
      );

      mainSocket.on(
        "hostSelectLevelError",
        data => {
          console.error(
            "MAIN: hostSelectLevel rechazado",
            data
          );
        }
      );

      mainSocket.on(
        "hostSelectLevelAccepted",
        data => {
          console.log(
            "MAIN: Nivel 2 aceptado por servidor",
            data
          );
        }
      );

      mainSocket.on(
        "navigateToLevel",
        data => {

          if (
            Number(
              data?.level
            ) === 2
          ) {

            window.location.replace(
              "Nivel_2/index.html"
            );
          }
        }
      );

      mainSocket.on(
        "connect_error",
        error => {

          console.error(
            "MAIN: error de conexión",
            error
          );
        }
      );
    }


function updateMainPlayerCount(
      serverState = null
    ) {

      const el =
        document.getElementById(
          "mainPlayerCount"
        );

      if (!el) {
        return;
      }

      const count =
        serverState &&
        typeof serverState.players ===
          "number"
          ? serverState.players
          : 0;

      el.textContent =
        "JUGADORES: " +
        count +
        " / 4";
    }


    let mainServerIsHost = false;


    function updateMainLevel2Button(
      serverState = null
    ) {

      const button =
        document.getElementById(
          "level2Button"
        );

      const status =
        document.getElementById(
          "level2Status"
        );

      const card =
        document.getElementById(
          "level2Card"
        );

      if (
        !button ||
        !status ||
        !card
      ) {
        return;
      }

      let completed =
        mainArrivedAfterLevel1;

      if (
        serverState &&
        Array.isArray(
          serverState.completedLevels
        ) &&
        serverState.completedLevels.includes(1)
      ) {
        completed = true;
      }

      if (!completed) {
        button.disabled = true;
        button.textContent = "Bloqueado";
        status.textContent =
          "Completa el expediente 01";
        card.classList.add("locked");
        return;
      }

      /*
       * Solo el servidor puede conceder el papel de anfitrión.
       */
      const isHost =
        mainServerIsHost === true ||
        localStorage.getItem(
          "fermatIsHost"
        ) === "1";

      button.disabled =
        !isHost;

      button.textContent =
        isHost
          ? "ENTRAR"
          : "ESPERANDO AL ANFITRIÓN";

      status.textContent =
        isHost
          ? "Disponible"
          : "Esperando al anfitrión";

      card.classList.toggle(
        "locked",
        !isHost
      );
    }


    function forceMainLevel2UI() {

      updateMainLevel2Button();
    }


    function goToLevel(
      level
    ) {

      const paths = {

        1:
          "Nivel_1/index.html",

        2:
          "Nivel_2/index.html",

        3:
          "Nivel_3/index.html",

        4:
          "Nivel_4/index.html",

        5:
          "Nivel_5/index.html",

        6:
          "Nivel_6/index.html",

        7:
          "Nivel_7/index.html",

        8:
          "Nivel_8/index.html",

        9:
          "Nivel_9/index.html",

        10:
          "Nivel_10/index.html"

      };


      if (
        paths[level]
      ) {

        window.location.href =
          paths[level];

      }

    }
	
const backgroundMusic =
  document.getElementById(
    "backgroundMusic"
  );


let musicStarted =
  false;


async function startBackgroundMusic() {

  if (
    !backgroundMusic ||
    musicStarted
  ) {

    return;
  }


  try {

    await backgroundMusic.play();

    musicStarted =
      true;

  } catch (
    error
  ) {

    /*
     * El navegador ha bloqueado
     * el autoplay.
     * Esperamos una interacción.
     */

  }
}


/*
 * Primer intento al cargar.
 */

startBackgroundMusic();


/*
 * Primera interacción del usuario.
 *
 * pointerdown ocurre antes que click,
 * por lo que la música se intenta iniciar
 * lo antes posible.
 */

document.addEventListener(
  "pointerdown",
  () => {

    if (
      !musicStarted
    ) {

      startBackgroundMusic();
    }

  },
  {
    once:
      true
  }
);


/*
 * También permitimos una tecla.
 */

document.addEventListener(
  "keydown",
  () => {

    if (
      !musicStarted
    ) {

      startBackgroundMusic();
    }

  },
  {
    once:
      true
  }
);
      updateMainLevel2Button();
      connectMainRoom();
      forceMainLevel2UI();
    const authoritativeLevel2Button =
      document.getElementById(
        "level2Button"
      );

    if (
      authoritativeLevel2Button
    ) {

      authoritativeLevel2Button.addEventListener(
        "click",
        () => {

          console.log(
            "MAIN: clic único Nivel 2",
            {
              isHost:
                mainServerIsHost,
              connected:
                Boolean(
                  mainSocket &&
                  mainSocket.connected
                ),
              roomCode:
                mainRoomCode,
              playerToken:
                mainPlayerToken
            }
          );

          const localHost =
            localStorage.getItem(
              "fermatIsHost"
            ) === "1";

          if (
            !mainServerIsHost &&
            !localHost
          ) {
            console.warn(
              "MAIN: clic ignorado, no es el anfitrión"
            );
            return;
          }

          if (
            !mainSocket ||
            !mainSocket.connected
          ) {
            console.error(
              "MAIN: socket no conectado"
            );
            return;
          }

          mainSocket.emit(
            "hostSelectLevel",
            {
              roomCode:
                mainRoomCode,
              playerToken:
                mainPlayerToken,
              targetLevel:
                2
            }
          );
        }
      );
    }

</script>

</body>

</html>
