<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>El Número Mágico</title>
<style>
:root{
  --bg:#0a141c;
  --panel:#101c25;
  --line:#35505e;
  --accent:#55d7c6;
  --text:#ece8de;
  --muted:#93aab3;
  --green:#68df98;
  --red:#d56a62;
}
*{box-sizing:border-box}
html,body{
  margin:0;
  min-height:100%;
  background:var(--bg);
  color:var(--text);
  overflow:hidden;
}
body{
  font-family:Georgia,"Times New Roman",serif;
  display:flex;
  justify-content:center;
  align-items:flex-start;
  padding:0 5px 2px;
}
.frame{
  width:min(730px,100%);
  padding:5px 8px 4px;
  border:1px solid #29404b;
  background:linear-gradient(180deg,#0c1720,#071017);
  box-shadow:0 12px 35px rgba(0,0,0,.35);
}
.instructions{
  margin:2px auto 5px !important;
  max-width:680px !important;
  text-align:left !important;
  font-family:"Orbitron","Eurostile","Segoe UI",Arial,sans-serif !important;
  font-size:14px !important;
  line-height:1.50 !important;
  letter-spacing:.045em !important;
}
.instructions .steps{
  margin:0 !important;
  padding-left:20px !important;
  font-size:inherit !important;
  line-height:inherit !important;
}
.instructions .steps li{
  margin:1px 0 !important;
  font-size:inherit !important;
  line-height:inherit !important;
}
.steps{
  margin:0;
  padding-left:20px;
}
.steps li{
  margin:1px 0;
}
.answer{
  margin:6px 0 0;
  width:100%;
  display:flex;
  align-items:center;
  justify-content:flex-start;
  gap:9px;
  padding-left:0;
}
.answer-label{
  font-family:"Orbitron","Eurostile","Segoe UI",Arial,sans-serif;
  font-size:12px;
  letter-spacing:.11em;
  color:var(--muted);
  font-weight:700;
}
.choices{
  display:flex;
  justify-content:center;
  align-items:center;
  gap:5px;
  flex-wrap:nowrap;
  margin-top:5px;
}
.choice{
  width:46px;
  height:30px;
  padding:0;
  border:1px solid #5f7783;
  border-radius:5px;
  background:linear-gradient(180deg,#17303a,#10242d);
  color:var(--text);
  font-family:"Orbitron","Eurostile","Segoe UI",Arial,sans-serif;
  font-size:16px;
  font-weight:900;
  letter-spacing:.04em;
  cursor:pointer;
  transition:.15s ease;
}
.choice:hover{
  border-color:var(--accent);
  transform:translateY(-1px);
}
.choice:active{
  transform:translateY(0);
}
.choice.selected{
  border-color:var(--accent);
  box-shadow:0 0 0 2px rgba(85,215,198,.12);
}
.feedback{
  min-height:13px;
  margin-top:4px;
  text-align:center;
  font-family:"Orbitron","Eurostile","Segoe UI",Arial,sans-serif;
  font-size:8px;
  letter-spacing:.08em;
}
@media(max-width:620px){
  .frame{padding:4px 6px 3px}
  .instructions{font-size:16px !important;line-height:1.50 !important}
  .answer{
    align-items:flex-start;
    flex-direction:column;
    gap:5px;
  }
  .choices{
    gap:4px;
    flex-wrap:wrap;
    max-width:310px;
    margin:0;
  }
  .choice{
    width:40px;
    height:28px;
    font-size:16px;
  }
}
</style>
</head>
<body>
<main class="frame">
  <div class="instructions">
    <ol class="steps">
      <li>Escoge un número de tres cifras.</li>
      <li>Escribe el número de seis cifras que resulta al escribir el número anterior dos veces.</li>
      <li>Divide este número entre 11.</li>
      <li>Divide el resultado entre 7.</li>
      <li>Divide el nuevo resultado entre el número de tres cifras que habías pensado.</li>
    </ol>
  </div>

  <div class="answer">
    <div class="answer-label">&nbsp; &nbsp; PULSA EL RESULTADO FINAL</div>
    <div class="choices" id="choices" role="group" aria-label="Posibles resultados">
      <button class="choice" type="button" data-value="2">5</button>
      <button class="choice" type="button" data-value="5">7</button>
      <button class="choice" type="button" data-value="8">11</button>
      <button class="choice" type="button" data-value="13">13</button>
      <button class="choice" type="button" data-value="17">17</button>
      <button class="choice" type="button" data-value="21">21</button>
      <button class="choice" type="button" data-value="26">23</button>
    </div>
  </div>

  <div id="feedback" class="feedback" aria-live="polite"></div>
</main>

<script>
const choices = [...document.querySelectorAll(".choice")];
const feedback = document.getElementById("feedback");

let sent = false;

function check(value){
  if(sent) return;

  /*
   * El procedimiento de la fuente lleva a un resultado único para cualquier
   * número de tres cifras: repetir ABC dos veces equivale a ABC * 1001,
   * y 1001 = 11 * 7 * 13. Al dividir entre 11 y después entre 7, queda 13.
   */
  if(value === "13"){
    sent = true;
    feedback.textContent = "RESPUESTA ACERTADA";
    feedback.style.color = "var(--green)";

    window.parent.postMessage({
      type:"questionSolved",
      answer:"13"
    },"*");
  }else{
    feedback.textContent = "RESPUESTA INCORRECTA";
    feedback.style.color = "var(--red)";

    window.parent.postMessage({
      type:"questionFailed",
      answer:value
    },"*");

    setTimeout(()=>{
      choices.forEach(choice => {
        choice.classList.remove("selected");
      });
      feedback.textContent = "";
      sent = false;
    },700);
  }
}

choices.forEach(choice=>{
  choice.addEventListener("click",()=>{
    choices.forEach(c=>c.classList.remove("selected"));
    choice.classList.add("selected");
    check(choice.dataset.value);
  });
});

window.parent.postMessage({
  type:"questionTitle",
  title:"El Número Mágico"
},"*");
</script>
</body>
</html>
