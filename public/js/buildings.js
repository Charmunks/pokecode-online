const BUILDINGS = [
  pokemart({ id: "northeast-pokemart", name: "Northeast Pokémart", x: 45, y: 1 }),
];

// A 4×4 Pokémart with its door on the bottom row. x/y is its top-left tile.
function pokemart({ id, name, x, y }) {
  return {
    id,
    name,
    type: "pokemart",
    sprite: "assets/tiles/pokemart.png",
    position: { x, y },
    size: { width: 4, height: 4 },
    entrance: { x: 1, y: 3 },
    onEnter: healParty,
  };
}

// Where a player stands when they black out: the last Pokémart they healed at,
// or the first Pokémart on the map if they haven't used one.
function respawnPokemart(lastPokemartId) {
  return (
    BUILDINGS.find(({ id, type }) => type === "pokemart" && id === lastPokemartId) ||
    BUILDINGS.find(({ type }) => type === "pokemart")
  );
}

// Pixel position of the player sprite standing on the tile below a building's entrance.
function buildingDoorstep({ position, entrance }) {
  const col = position.x + entrance.x + (entrance.width || 1) / 2;
  const row = position.y + entrance.y + (entrance.height || 1);
  // The sprite's feet are 14px below its center (see game.js).
  return { x: col * TILE_SIZE, y: row * TILE_SIZE + TILE_SIZE / 2 - 14 };
}

// Shows a text box with a list of choices; resolves with the chosen one.
// Escape picks the last choice. Up/down arrows move between choices.
function showChoiceDialog(message, choices) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:300;display:flex;justify-content:center;align-items:flex-end;padding-bottom:40px;font-family:'Press Start 2P',monospace;";

    const panel = document.createElement("div");
    panel.style.cssText =
      "background:#f8f8f0;border:4px solid #383838;box-shadow:0 0 0 4px #f8f8f0;padding:16px 20px;width:520px;max-width:90vw;color:#383838;display:flex;justify-content:space-between;align-items:center;gap:16px;";

    const text = document.createElement("p");
    text.textContent = message;
    text.style.cssText = "font-size:10px;line-height:1.8;margin:0;";

    const choiceList = document.createElement("div");
    choiceList.style.cssText = "display:flex;flex-direction:column;gap:8px;flex-shrink:0;";

    const buttons = choices.map((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = choice;
      button.style.cssText =
        "background:#fff;color:#383838;border:2px solid #383838;padding:6px 14px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;";
      button.addEventListener("focus", () => (button.style.background = "#fff0f2"));
      button.addEventListener("blur", () => (button.style.background = "#fff"));
      button.addEventListener("click", () => close(choice));
      choiceList.appendChild(button);
      return button;
    });

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close(choices[choices.length - 1]);
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        if (e.repeat) return;
        const index = buttons.indexOf(document.activeElement);
        const offset = e.key === "ArrowUp" ? -1 : 1;
        buttons[(index + offset + buttons.length) % buttons.length].focus();
      }
    }

    function close(choice) {
      document.removeEventListener("keydown", onKeyDown, true);
      overlay.remove();
      resolve(choice);
    }

    panel.appendChild(text);
    panel.appendChild(choiceList);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onKeyDown, true);
    buttons[0].focus();
  });
}

async function healParty({ building, user, appendChatMessage }) {
  const choice = await showChoiceDialog("Do you want to heal your Pokémon?", ["YES", "NO"]);
  if (choice !== "YES") return;

  let message = "Your Pokémon were restored to full health!";
  try {
    const res = await fetch("api/my-pokemon/heal-party", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pokemartId: building.id }),
    });
    if (res.ok) {
      user.lastPokemartId = building.id;
    } else {
      message = "Could not heal your Pokémon.";
    }
  } catch (err) {
    message = "Connection error. Could not heal your Pokémon.";
  }
  appendChatMessage({ type: "system", message });
}

function buildingAt(px, py) {
  const col = Math.floor(px / TILE_SIZE);
  const row = Math.floor(py / TILE_SIZE);
  return BUILDINGS.find(
    ({ position, size }) =>
      col >= position.x &&
      col < position.x + size.width &&
      row >= position.y &&
      row < position.y + size.height
  );
}

// Returns the building whose entrance overlaps the foot hitbox centered at (cx, cy).
function findBuildingEntrance(cx, cy) {
  for (const [px, py] of footHitboxCorners(cx, cy)) {
    const building = buildingAt(px, py);
    if (!building) continue;
    const { position, entrance } = building;
    const col = Math.floor(px / TILE_SIZE) - position.x - entrance.x;
    const row = Math.floor(py / TILE_SIZE) - position.y - entrance.y;
    if (
      col >= 0 &&
      col < (entrance.width || 1) &&
      row >= 0 &&
      row < (entrance.height || 1)
    ) {
      return building;
    }
  }
  return null;
}

function preloadBuildingAssets(scene) {
  new Set(BUILDINGS.map(({ sprite }) => sprite)).forEach((sprite) => {
    scene.load.image(sprite, sprite);
  });
}

function renderBuildings(scene) {
  BUILDINGS.forEach(({ sprite, position, size }) => {
    scene.add
      .image(position.x * TILE_SIZE, position.y * TILE_SIZE, sprite)
      .setOrigin(0, 0)
      .setDisplaySize(size.width * TILE_SIZE, size.height * TILE_SIZE)
      .setDepth(1);
  });
}
