let selectedGender = "male";
let selectedStarter = null;
let currentUser = null;

function selectGender(gender) {
  selectedGender = gender;
  document.querySelectorAll(".gender-option").forEach((el) => {
    el.classList.toggle("selected", el.dataset.gender === gender);
  });
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.remove("hidden");
}

async function submitSetup() {
  const usernameInput = document.getElementById("setup-username");
  const errorEl = document.getElementById("setup-error");
  const username = usernameInput.value.trim();
  errorEl.textContent = "";

  if (!username) {
    usernameInput.style.borderColor = "#ec3750";
    usernameInput.focus();
    return;
  }

  try {
    const res = await fetch("api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, gender: selectedGender }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || "Something went wrong";
      return;
    }

    currentUser = data.user;
    continueToGame();
  } catch (err) {
    errorEl.textContent = "Connection error";
  }
}

document.getElementById("setup-username").addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitSetup();
});

document.querySelectorAll(".starter-option").forEach((option) => {
  option.addEventListener("click", () => {
    selectedStarter = option.dataset.species;
    document.querySelectorAll(".starter-option").forEach((candidate) => {
      candidate.classList.toggle("selected", candidate === option);
    });
    document.getElementById("starter-confirm").disabled = false;
    document.getElementById("starter-error").textContent = "";
  });
});

document.getElementById("starter-confirm").addEventListener("click", async () => {
  if (!selectedStarter) return;

  const confirmButton = document.getElementById("starter-confirm");
  const errorEl = document.getElementById("starter-error");
  confirmButton.disabled = true;
  errorEl.textContent = "";

  try {
    const res = await fetch("api/starter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speciesId: selectedStarter }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || "Could not choose your starter";
      confirmButton.disabled = false;
      return;
    }

    currentUser.needsStarter = false;
    launchGame();
  } catch (err) {
    errorEl.textContent = "Connection error";
    confirmButton.disabled = false;
  }
});

function continueToGame() {
  if (currentUser.needsStarter) {
    showScreen("starter-screen");
  } else {
    launchGame();
  }
}

function launchGame() {
  showScreen(null);
  document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
  document.getElementById("game-container").style.display = "block";
  startGame(currentUser);
}

// Check auth state on load
async function init() {
  try {
    const res = await fetch("api/me");
    const data = await res.json();

    if (data.user) {
      currentUser = data.user;
      if (!currentUser.username) {
        showScreen("setup-screen");
      } else {
        continueToGame();
      }
    } else {
      showScreen("login-screen");
    }
  } catch (err) {
    showScreen("login-screen");
  }
}

init();
