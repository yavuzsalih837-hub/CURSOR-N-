const deployBtn = document.querySelector("#deploy-btn");
const objectiveInput = document.querySelector("#objective");
const telemetry = document.querySelector("#telemetry");

async function deployMission() {
  const text = objectiveInput.value;

  if (!text) {
    alert("Görev yaz.");
    return;
  }

  telemetry.innerHTML += `<div>Mission queued: ${text}</div>`;

  try {

    const res = await fetch("/api/mission", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        objective: text
      })
    });

    const data = await res.json();

    telemetry.innerHTML += `
      <div style="color:lime;">
        ${data.reply}
      </div>
    `;

  } catch (err) {

    console.error(err);

    telemetry.innerHTML += `
      <div style="color:red;">
        ERROR
      </div>
    `;
  }
}

deployBtn.addEventListener("click", deployMission);