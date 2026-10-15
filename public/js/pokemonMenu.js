// ─── Pokémon menu ───
// The "1" overlay: Pokémon list/summary, bag, shop, and admin tools.
// gameData holds the species/moves/items JSON loaded by game.js.
// onOpen runs before the menu opens (used to close other overlays).
function createPokemonMenu({ user, gameData, onOpen }) {
  let pokemonMenuOpen = false;
  let myPokemon = { party: [], box: [] };
  let myItems = [];
  let myCurrency = { pokedollars: 0, watts: 0 };
  let selectedItemType = null;
  let myProjects = { hackatimeConnected: Boolean(user.hackatimeConnected), projects: [] };
  let hackatimeProjects = null;
  let myProfile = null;

  const pokemonOverlay = document.createElement("div");
  pokemonOverlay.id = "pokemon-menu-overlay";
  pokemonOverlay.style.cssText =
    "display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:300;justify-content:center;align-items:center;font-family:'Press Start 2P',monospace;";

  const pokemonPanel = document.createElement("div");
  pokemonPanel.style.cssText =
    "background:#f8f8f0;border:4px solid #383838;padding:20px;width:640px;max-width:90vw;max-height:80vh;overflow-y:auto;color:#383838;";

  const pokemonTitle = document.createElement("h2");
  pokemonTitle.textContent = "YOUR POKÉMON";
  pokemonTitle.style.cssText = "font-size:14px;margin-bottom:16px;letter-spacing:2px;";

  const menuNavigation = document.createElement("div");
  menuNavigation.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;";

  const pokemonMenuButton = document.createElement("button");
  pokemonMenuButton.type = "button";
  pokemonMenuButton.textContent = "POKÉMON";
  pokemonMenuButton.style.cssText =
    "padding:9px 12px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

  const bagMenuButton = document.createElement("button");
  bagMenuButton.type = "button";
  bagMenuButton.textContent = "BAG";
  bagMenuButton.style.cssText =
    "padding:9px 12px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;cursor:pointer;";

  const shopMenuButton = document.createElement("button");
  shopMenuButton.type = "button";
  shopMenuButton.textContent = "SHOP";
  shopMenuButton.style.cssText =
    "padding:9px 12px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;cursor:pointer;";

  const projectsMenuButton = document.createElement("button");
  projectsMenuButton.type = "button";
  projectsMenuButton.textContent = "PROJECTS";
  projectsMenuButton.style.cssText =
    "padding:9px 12px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;cursor:pointer;";

  const profileMenuButton = document.createElement("button");
  profileMenuButton.type = "button";
  profileMenuButton.textContent = "PROFILE";
  profileMenuButton.style.cssText =
    "padding:9px 12px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;cursor:pointer;";

  menuNavigation.appendChild(pokemonMenuButton);
  menuNavigation.appendChild(bagMenuButton);
  menuNavigation.appendChild(shopMenuButton);
  menuNavigation.appendChild(projectsMenuButton);
  menuNavigation.appendChild(profileMenuButton);

  const currencyBar = document.createElement("div");
  currencyBar.style.cssText =
    "display:flex;gap:8px;margin-bottom:16px;font-size:8px;";

  function currencyBox(label, color) {
    const box = document.createElement("div");
    box.style.cssText =
      "flex:1;display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border:2px solid #383838;background:#fff;";
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    labelEl.style.color = color;
    const valueEl = document.createElement("span");
    box.appendChild(labelEl);
    box.appendChild(valueEl);
    currencyBar.appendChild(box);
    return valueEl;
  }

  const pokedollarsValue = currencyBox("POKÉDOLLARS", "#ec3750");
  const wattsValue = currencyBox("WATTS", "#338eda");

  function renderCurrency() {
    pokedollarsValue.textContent = myCurrency.pokedollars.toLocaleString();
    wattsValue.textContent = myCurrency.watts.toLocaleString();
  }

  const pokemonListView = document.createElement("div");

  const partyLabel = document.createElement("div");
  partyLabel.style.cssText = "font-size:9px;color:#ec3750;margin-bottom:8px;";

  const partyGrid = document.createElement("div");
  partyGrid.style.cssText =
    "display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:20px;";

  const boxLabel = document.createElement("div");
  boxLabel.style.cssText = "font-size:9px;color:#ec3750;margin-bottom:8px;";

  const boxGrid = document.createElement("div");
  boxGrid.style.cssText = "display:grid;grid-template-columns:repeat(6,1fr);gap:8px;";

  const adminControls = document.createElement("div");
  adminControls.style.cssText =
    "display:none;margin-top:20px;padding-top:16px;border-top:2px solid #c0c0c0;";

  const adminLabel = document.createElement("div");
  adminLabel.textContent = "ADMIN: ADD TO PARTY";
  adminLabel.style.cssText = "font-size:9px;color:#ec3750;margin-bottom:8px;";

  const adminRow = document.createElement("div");
  adminRow.style.cssText = "display:flex;gap:8px;";

  const speciesSelect = document.createElement("select");
  speciesSelect.style.cssText =
    "min-width:0;flex:1;padding:8px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;";

  const addPokemonButton = document.createElement("button");
  addPokemonButton.type = "button";
  addPokemonButton.textContent = "ADD";
  addPokemonButton.style.cssText =
    "padding:8px 12px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

  const adminMessage = document.createElement("div");
  adminMessage.style.cssText = "min-height:12px;margin-top:8px;font-size:7px;color:#585858;";

  adminRow.appendChild(speciesSelect);
  adminRow.appendChild(addPokemonButton);
  adminControls.appendChild(adminLabel);
  adminControls.appendChild(adminRow);
  adminControls.appendChild(adminMessage);

  const pokemonHint = document.createElement("div");
  pokemonHint.textContent = "Press 1 or ESC to close";
  pokemonHint.style.cssText =
    "font-size:8px;color:#585858;margin-top:20px;text-align:center;";

  const pokemonSummary = document.createElement("div");
  pokemonSummary.style.display = "none";

  const bagView = document.createElement("div");
  bagView.style.display = "none";

  const itemTypeTabs = document.createElement("div");
  itemTypeTabs.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;";

  const itemList = document.createElement("div");
  itemList.style.cssText = "display:grid;gap:8px;";

  const bagMessage = document.createElement("div");
  bagMessage.style.cssText = "min-height:12px;margin-top:8px;font-size:7px;color:#585858;line-height:1.7;";

  const itemAdminControls = document.createElement("div");
  itemAdminControls.style.cssText =
    "display:none;margin-top:20px;padding-top:16px;border-top:2px solid #c0c0c0;";

  const itemAdminLabel = document.createElement("div");
  itemAdminLabel.textContent = "ADMIN: ADD TO BAG";
  itemAdminLabel.style.cssText = "font-size:9px;color:#ec3750;margin-bottom:8px;";

  const itemAdminRow = document.createElement("div");
  itemAdminRow.style.cssText = "display:flex;gap:8px;";

  const itemSelect = document.createElement("select");
  itemSelect.style.cssText =
    "min-width:0;flex:1;padding:8px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;";

  const itemQuantity = document.createElement("input");
  itemQuantity.type = "number";
  itemQuantity.min = "1";
  itemQuantity.max = "999";
  itemQuantity.value = "1";
  itemQuantity.setAttribute("aria-label", "Item quantity");
  itemQuantity.style.cssText =
    "width:75px;padding:8px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;";

  const addItemButton = document.createElement("button");
  addItemButton.type = "button";
  addItemButton.textContent = "ADD";
  addItemButton.style.cssText =
    "padding:8px 12px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

  const itemAdminMessage = document.createElement("div");
  itemAdminMessage.style.cssText =
    "min-height:12px;margin-top:8px;font-size:7px;color:#585858;";

  const bagHint = document.createElement("div");
  bagHint.textContent = "Press 1 or ESC to close";
  bagHint.style.cssText = "font-size:8px;color:#585858;margin-top:20px;text-align:center;";

  itemAdminRow.appendChild(itemSelect);
  itemAdminRow.appendChild(itemQuantity);
  itemAdminRow.appendChild(addItemButton);
  itemAdminControls.appendChild(itemAdminLabel);
  itemAdminControls.appendChild(itemAdminRow);
  itemAdminControls.appendChild(itemAdminMessage);
  bagView.appendChild(itemTypeTabs);
  bagView.appendChild(itemList);
  bagView.appendChild(bagMessage);
  bagView.appendChild(itemAdminControls);
  bagView.appendChild(bagHint);

  pokemonPanel.appendChild(menuNavigation);
  pokemonPanel.appendChild(currencyBar);
  pokemonPanel.appendChild(pokemonTitle);
  pokemonListView.appendChild(partyLabel);
  pokemonListView.appendChild(partyGrid);
  pokemonListView.appendChild(boxLabel);
  pokemonListView.appendChild(boxGrid);
  pokemonListView.appendChild(adminControls);
  pokemonListView.appendChild(pokemonHint);
  pokemonPanel.appendChild(pokemonListView);
  pokemonPanel.appendChild(pokemonSummary);
  pokemonPanel.appendChild(bagView);

  const shopView = document.createElement("div");
  shopView.style.display = "none";

  const shopList = document.createElement("div");

  const shopMessage = document.createElement("div");
  shopMessage.style.cssText = "min-height:12px;margin-top:8px;font-size:7px;color:#585858;";

  const shopHint = document.createElement("div");
  shopHint.textContent = "Press 1 or ESC to close";
  shopHint.style.cssText = "font-size:8px;color:#585858;margin-top:20px;text-align:center;";

  shopView.appendChild(shopList);
  shopView.appendChild(shopMessage);
  shopView.appendChild(shopHint);
  pokemonPanel.appendChild(shopView);

  // Contents are rebuilt by renderProjects() / renderProjectForm().
  const projectsView = document.createElement("div");
  projectsView.style.display = "none";
  pokemonPanel.appendChild(projectsView);

  // Contents are rebuilt by renderProfile().
  const profileView = document.createElement("div");
  profileView.style.display = "none";
  pokemonPanel.appendChild(profileView);
  pokemonOverlay.appendChild(pokemonPanel);
  document.body.appendChild(pokemonOverlay);

  function pokemonPlaceholderSprite(label) {
    const colors = ["#ec3750", "#33d6a6", "#338eda", "#f1c40f", "#a463f2", "#ff8c42"];
    let hash = 0;
    for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
    const color = colors[Math.abs(hash) % colors.length];
    const letter = label.charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${color}"/><text x="32" y="42" font-size="28" font-family="monospace" fill="#fff" text-anchor="middle">${letter}</text></svg>`;
    return "data:image/svg+xml;base64," + btoa(svg);
  }

  // Clicking a slot opens the Pokémon's summary, or calls onSelect(mon) when given.
  function pokemonSlotEl(mon, onSelect = null) {
    const slot = document.createElement(mon ? "button" : "div");
    slot.style.cssText =
      "display:flex;flex-direction:column;align-items:center;background:#fff;border:2px solid " +
      (mon ? "#383838" : "#c0c0c0") +
      ";padding:6px 4px;min-height:88px;justify-content:center;font-family:'Press Start 2P',monospace;";

    if (!mon) {
      slot.style.borderStyle = "dashed";
      const empty = document.createElement("div");
      empty.textContent = "—";
      empty.style.cssText = "font-size:16px;color:#c0c0c0;";
      slot.appendChild(empty);
      return slot;
    }

    slot.type = "button";
    slot.style.cursor = "pointer";
    if (onSelect) {
      slot.setAttribute("aria-label", `Choose ${mon.nickname || mon.speciesId}`);
      slot.addEventListener("click", () => onSelect(mon));
    } else {
      slot.setAttribute("aria-label", `View ${mon.nickname || mon.speciesId} summary`);
      slot.addEventListener("click", () => renderPokemonSummary(mon));
    }

    const species = gameData.species[mon.speciesId] || {};
    const img = document.createElement("img");
    img.src = species.mainSprite || "";
    img.width = 48;
    img.height = 48;
    img.style.cssText = "image-rendering:pixelated;margin-bottom:4px;";
    img.onerror = () => {
      img.onerror = null;
      img.src = pokemonPlaceholderSprite(species.name || mon.speciesId || "?");
    };

    const label = document.createElement("div");
    label.textContent = mon.nickname || species.name || mon.speciesId;
    label.style.cssText = "font-size:7px;text-align:center;word-break:break-word;";

    const level = document.createElement("div");
    level.textContent = `Lv. ${mon.level}`;
    level.style.cssText = "font-size:6px;color:#585858;margin-top:4px;";

    const health = document.createElement("div");
    health.textContent = `HP ${mon.health}/${pokemonStats(species, mon.level).HP}`;
    health.style.cssText = "font-size:6px;color:#ec3750;margin-top:4px;";

    slot.appendChild(img);
    slot.appendChild(label);
    slot.appendChild(level);
    slot.appendChild(health);
    if (mon.status) {
      const status = document.createElement("div");
      status.textContent = mon.status.name.toUpperCase();
      status.style.cssText = "font-size:6px;color:#a463f2;margin-top:4px;";
      slot.appendChild(status);
    }
    return slot;
  }

  function learnableMoves(mon) {
    return (gameData.species[mon.speciesId]?.moves || [])
      .filter((learnedMove) => learnedMove.level <= mon.level)
      .map((learnedMove) => learnedMove.move);
  }

  function renderMovePicker(mon) {
    const availableMoves = learnableMoves(mon);
    const selectedMoves = new Set(
      (mon.moves || []).filter((moveId) => availableMoves.includes(moveId)).slice(0, 4)
    );
    const requiredMoveCount = Math.min(4, availableMoves.length);

    pokemonSummary.innerHTML = "";

    const heading = document.createElement("div");
    heading.textContent = `CHOOSE ${requiredMoveCount} MOVES`;
    heading.style.cssText = "font-size:11px;color:#ec3750;margin-bottom:8px;";

    const instructions = document.createElement("div");
    instructions.style.cssText = "font-size:7px;color:#585858;line-height:1.7;margin-bottom:14px;";

    const choices = document.createElement("div");
    choices.style.cssText =
      "display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px;";

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:8px;";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "CANCEL";
    cancelButton.style.cssText =
      "padding:8px 10px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;cursor:pointer;";
    cancelButton.addEventListener("click", () => renderPokemonSummary(mon));

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "SAVE MOVES";
    saveButton.style.cssText =
      "padding:8px 10px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

    const message = document.createElement("div");
    message.style.cssText = "min-height:12px;margin-top:10px;font-size:7px;color:#ec3750;";

    function updateMovePicker() {
      instructions.textContent =
        `${selectedMoves.size}/${requiredMoveCount} selected. Select exactly ${requiredMoveCount} moves.`;
      saveButton.disabled = selectedMoves.size !== requiredMoveCount;
      saveButton.style.background = saveButton.disabled ? "#a0a0a0" : "#ec3750";
      saveButton.style.cursor = saveButton.disabled ? "not-allowed" : "pointer";
    }

    availableMoves.forEach((moveId) => {
      const move = gameData.moves[moveId] || { name: moveId };
      const label = document.createElement("label");
      label.style.cssText =
        "display:flex;align-items:center;gap:8px;background:#fff;border:2px solid #383838;padding:10px;font-size:8px;line-height:1.5;cursor:pointer;";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selectedMoves.has(moveId);
      checkbox.addEventListener("change", () => {
        message.textContent = "";
        if (checkbox.checked && selectedMoves.size >= 4) {
          checkbox.checked = false;
          message.textContent = "A Pokémon can only know four moves.";
        } else if (checkbox.checked) {
          selectedMoves.add(moveId);
        } else {
          selectedMoves.delete(moveId);
        }
        updateMovePicker();
      });

      const moveText = document.createElement("span");
      moveText.textContent = `${move.name} · ${move.type || "Unknown"}`;
      label.appendChild(checkbox);
      label.appendChild(moveText);
      choices.appendChild(label);
    });

    saveButton.addEventListener("click", async () => {
      if (selectedMoves.size !== requiredMoveCount) return;
      saveButton.disabled = true;
      message.style.color = "#585858";
      message.textContent = "Saving...";

      try {
        const response = await fetch(`api/my-pokemon/${mon.id}/moves`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moves: Array.from(selectedMoves) }),
        });
        const data = await response.json();
        if (!response.ok) {
          message.style.color = "#ec3750";
          message.textContent = data.error || "Could not save moves.";
          updateMovePicker();
          return;
        }

        mon.moves = data.pokemon.moves;
        renderPokemonSummary(mon);
      } catch (err) {
        message.style.color = "#ec3750";
        message.textContent = "Connection error.";
        updateMovePicker();
      }
    });

    actions.appendChild(cancelButton);
    actions.appendChild(saveButton);
    pokemonSummary.appendChild(heading);
    pokemonSummary.appendChild(instructions);
    pokemonSummary.appendChild(choices);
    pokemonSummary.appendChild(actions);
    pokemonSummary.appendChild(message);
    updateMovePicker();
  }

  function renderPokemonSummary(mon) {
    const species = gameData.species[mon.speciesId] || {};
    const displayName = mon.nickname || species.name || mon.speciesId;
    const stats = pokemonStats(species, mon.level);

    pokemonTitle.textContent = "POKÉMON SUMMARY";
    pokemonListView.style.display = "none";
    pokemonSummary.style.display = "block";
    pokemonSummary.innerHTML = "";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.textContent = "◀ BACK";
    backButton.style.cssText =
      "padding:7px 10px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;cursor:pointer;margin-bottom:16px;";
    backButton.addEventListener("click", renderPokemonMenu);

    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;gap:18px;margin-bottom:18px;";

    const img = document.createElement("img");
    img.src = species.mainSprite || "";
    img.width = 96;
    img.height = 96;
    img.style.cssText = "image-rendering:pixelated;object-fit:contain;";
    img.onerror = () => {
      img.onerror = null;
      img.src = pokemonPlaceholderSprite(displayName);
    };

    const identity = document.createElement("div");
    const summaryName = document.createElement("div");
    summaryName.textContent = displayName;
    summaryName.style.cssText = "font-size:13px;margin-bottom:10px;";

    const summaryDetails = document.createElement("div");
    summaryDetails.style.cssText = "font-size:8px;color:#585858;line-height:2;";
    [
      species.name || mon.speciesId,
      `Lv. ${mon.level}`,
      `Health: ${mon.health}/${stats.HP}`,
      `Status: ${mon.status ? mon.status.name : "OK"}`,
      mon.expToNextLevel ? `EXP: ${mon.exp}/${mon.expToNextLevel}` : "EXP: MAX",
      `Friendship: ${mon.friendship}`,
    ].forEach((detail) => {
      const line = document.createElement("div");
      line.textContent = detail;
      summaryDetails.appendChild(line);
    });

    identity.appendChild(summaryName);
    identity.appendChild(summaryDetails);
    header.appendChild(img);
    header.appendChild(identity);

    if (user.admin) {
      const adminEditor = document.createElement("div");
      adminEditor.style.cssText =
        "display:flex;flex-direction:column;gap:10px;margin-bottom:18px;padding:12px;background:#fff;border:2px solid #c0c0c0;";

      const levelEditor = document.createElement("form");
      levelEditor.style.cssText =
        "display:flex;align-items:center;gap:8px;";

      const levelLabel = document.createElement("label");
      levelLabel.textContent = "ADMIN LEVEL";
      levelLabel.style.cssText = "font-size:8px;color:#ec3750;";

      const levelInput = document.createElement("input");
      levelInput.type = "number";
      levelInput.min = "1";
      levelInput.max = "100";
      levelInput.step = "1";
      levelInput.required = true;
      levelInput.value = mon.level;
      levelInput.setAttribute("aria-label", `${displayName} level`);
      levelInput.style.cssText =
        "width:70px;padding:7px;border:2px solid #383838;color:#383838;font:8px 'Press Start 2P',monospace;";

      const saveLevelButton = document.createElement("button");
      saveLevelButton.type = "submit";
      saveLevelButton.textContent = "SAVE";
      saveLevelButton.style.cssText =
        "padding:8px 10px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

      const levelMessage = document.createElement("div");
      levelMessage.style.cssText = "font-size:7px;color:#ec3750;line-height:1.5;";

      levelEditor.addEventListener("submit", async (event) => {
        event.preventDefault();
        const level = Number(levelInput.value);
        if (!Number.isInteger(level) || level < 1 || level > 100) {
          levelMessage.textContent = "Choose a whole number from 1 to 100.";
          return;
        }

        saveLevelButton.disabled = true;
        levelMessage.style.color = "#585858";
        levelMessage.textContent = "Saving...";

        try {
          const response = await fetch(`api/my-pokemon/${mon.id}/level`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ level }),
          });
          const data = await response.json();
          if (!response.ok) {
            levelMessage.style.color = "#ec3750";
            levelMessage.textContent = data.error || "Could not save level.";
            saveLevelButton.disabled = false;
            return;
          }

          mon.level = data.pokemon.level;
          renderPokemonSummary(mon);
        } catch (err) {
          levelMessage.style.color = "#ec3750";
          levelMessage.textContent = "Connection error.";
          saveLevelButton.disabled = false;
        }
      });

      levelEditor.appendChild(levelLabel);
      levelEditor.appendChild(levelInput);
      levelEditor.appendChild(saveLevelButton);
      levelEditor.appendChild(levelMessage);

      const healthEditor = document.createElement("form");
      healthEditor.style.cssText = "display:flex;align-items:center;gap:8px;";

      const healthLabel = document.createElement("label");
      healthLabel.textContent = "ADMIN HEALTH";
      healthLabel.style.cssText = "font-size:8px;color:#ec3750;";

      const healthInput = document.createElement("input");
      healthInput.type = "number";
      healthInput.min = "0";
      healthInput.max = String(stats.HP);
      healthInput.step = "1";
      healthInput.required = true;
      healthInput.value = mon.health;
      healthInput.setAttribute("aria-label", `${displayName} health`);
      healthInput.style.cssText =
        "width:70px;padding:7px;border:2px solid #383838;color:#383838;font:8px 'Press Start 2P',monospace;";

      const saveHealthButton = document.createElement("button");
      saveHealthButton.type = "submit";
      saveHealthButton.textContent = "SAVE";
      saveHealthButton.style.cssText =
        "padding:8px 10px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

      const healthMessage = document.createElement("div");
      healthMessage.style.cssText = "font-size:7px;color:#ec3750;line-height:1.5;";

      healthEditor.addEventListener("submit", async (event) => {
        event.preventDefault();
        const health = Number(healthInput.value);
        if (!Number.isInteger(health) || health < 0 || health > stats.HP) {
          healthMessage.textContent = `Choose a whole number from 0 to ${stats.HP}.`;
          return;
        }

        saveHealthButton.disabled = true;
        healthMessage.style.color = "#585858";
        healthMessage.textContent = "Saving...";

        try {
          const response = await fetch(`api/my-pokemon/${mon.id}/health`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ health }),
          });
          const data = await response.json();
          if (!response.ok) {
            healthMessage.style.color = "#ec3750";
            healthMessage.textContent = data.error || "Could not save health.";
            saveHealthButton.disabled = false;
            return;
          }

          mon.health = data.pokemon.health;
          renderPokemonSummary(mon);
        } catch (err) {
          healthMessage.style.color = "#ec3750";
          healthMessage.textContent = "Connection error.";
          saveHealthButton.disabled = false;
        }
      });

      healthEditor.appendChild(healthLabel);
      healthEditor.appendChild(healthInput);
      healthEditor.appendChild(saveHealthButton);
      healthEditor.appendChild(healthMessage);

      const deleteEditor = document.createElement("div");
      deleteEditor.style.cssText =
        "display:flex;align-items:center;gap:8px;padding-top:10px;border-top:2px solid #c0c0c0;";

      const deletePokemonButton = document.createElement("button");
      deletePokemonButton.type = "button";
      deletePokemonButton.textContent = "DELETE POKÉMON";
      deletePokemonButton.style.cssText =
        "padding:8px 10px;border:2px solid #383838;background:#b42318;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

      const deleteMessage = document.createElement("div");
      deleteMessage.style.cssText = "font-size:7px;color:#ec3750;line-height:1.5;";

      deletePokemonButton.addEventListener("click", async () => {
        if (!window.confirm(`Permanently delete ${displayName}? This cannot be undone.`)) {
          return;
        }

        deletePokemonButton.disabled = true;
        deleteMessage.style.color = "#585858";
        deleteMessage.textContent = "Deleting...";

        try {
          const response = await fetch(`api/my-pokemon/${mon.id}`, {
            method: "DELETE",
          });
          const data = await response.json();
          if (!response.ok) {
            deleteMessage.style.color = "#ec3750";
            deleteMessage.textContent = data.error || "Could not delete Pokémon.";
            deletePokemonButton.disabled = false;
            return;
          }

          await loadMyPokemon();
          renderPokemonMenu();
          adminMessage.style.color = "#198754";
          adminMessage.textContent = `${displayName} was deleted.`;
        } catch (err) {
          deleteMessage.style.color = "#ec3750";
          deleteMessage.textContent = "Connection error.";
          deletePokemonButton.disabled = false;
        }
      });

      deleteEditor.appendChild(deletePokemonButton);
      deleteEditor.appendChild(deleteMessage);
      adminEditor.appendChild(levelEditor);
      adminEditor.appendChild(healthEditor);
      adminEditor.appendChild(deleteEditor);
      pokemonSummary.appendChild(backButton);
      pokemonSummary.appendChild(header);
      pokemonSummary.appendChild(adminEditor);
    } else {
      pokemonSummary.appendChild(backButton);
      pokemonSummary.appendChild(header);
    }

    const statsLabel = document.createElement("div");
    statsLabel.textContent = "STATS";
    statsLabel.style.cssText = "font-size:9px;color:#ec3750;margin-bottom:8px;";

    const statsGrid = document.createElement("div");
    statsGrid.style.cssText =
      "display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:18px;";
    Object.entries(stats).forEach(([name, value]) => {
      const stat = document.createElement("div");
      stat.style.cssText =
        "background:#fff;border:2px solid #c0c0c0;padding:8px;font-size:7px;line-height:1.7;";
      stat.textContent = `${name}  ${value}`;
      statsGrid.appendChild(stat);
    });

    const movesLabel = document.createElement("div");
    movesLabel.textContent = "KNOWN MOVES";
    movesLabel.style.cssText = "font-size:9px;color:#ec3750;margin-bottom:8px;";

    const movesList = document.createElement("div");
    movesList.style.cssText = "display:grid;grid-template-columns:repeat(2,1fr);gap:8px;";
    if (!mon.moves || mon.moves.length === 0) {
      movesList.textContent = "This Pokémon does not know any moves.";
      movesList.style.cssText = "font-size:8px;color:#585858;line-height:1.7;";
    } else {
      mon.moves.forEach((moveId) => {
        const move = gameData.moves[moveId] || { name: moveId };
        const moveCard = document.createElement("div");
        moveCard.style.cssText = "background:#fff;border:2px solid #383838;padding:10px;";

        const moveName = document.createElement("div");
        moveName.textContent = move.name;
        moveName.style.cssText = "font-size:9px;margin-bottom:7px;";

        const moveDetails = document.createElement("div");
        const damage = move.damage > 0 ? move.damage : "—";
        moveDetails.textContent = `${move.type || "Unknown"} · ${move.category || "Unknown"} · PP ${move.pp ?? "—"} · DMG ${damage}`;
        moveDetails.style.cssText = "font-size:6px;color:#585858;line-height:1.7;";

        moveCard.appendChild(moveName);
        moveCard.appendChild(moveDetails);
        movesList.appendChild(moveCard);
      });
    }

    pokemonSummary.appendChild(statsLabel);
    pokemonSummary.appendChild(statsGrid);
    pokemonSummary.appendChild(movesLabel);
    pokemonSummary.appendChild(movesList);

    if (learnableMoves(mon).length > (mon.moves || []).length) {
      const chooseMovesButton = document.createElement("button");
      chooseMovesButton.type = "button";
      chooseMovesButton.textContent = "CHOOSE MOVES";
      chooseMovesButton.style.cssText =
        "margin-top:14px;padding:8px 10px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";
      chooseMovesButton.addEventListener("click", () => renderMovePicker(mon));
      pokemonSummary.appendChild(chooseMovesButton);
    }
  }

  function showMenuTab(title, view, button) {
    pokemonTitle.textContent = title;
    [pokemonListView, pokemonSummary, bagView, shopView, projectsView, profileView].forEach((tabView) => {
      tabView.style.display = tabView === view ? "block" : "none";
    });
    [pokemonMenuButton, bagMenuButton, shopMenuButton, projectsMenuButton, profileMenuButton].forEach((tabButton) => {
      tabButton.style.background = tabButton === button ? "#ec3750" : "#fff";
      tabButton.style.color = tabButton === button ? "#fff" : "#383838";
    });
  }

  function renderPokemonMenu() {
    showMenuTab("YOUR POKÉMON", pokemonListView, pokemonMenuButton);
    partyLabel.textContent = `PARTY (${myPokemon.party.length}/6)`;
    partyGrid.innerHTML = "";
    for (let i = 0; i < 6; i++) {
      partyGrid.appendChild(pokemonSlotEl(myPokemon.party[i] || null));
    }

    boxLabel.textContent = `BOX (${myPokemon.box.length})`;
    boxGrid.innerHTML = "";
    if (myPokemon.box.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "Your box is empty.";
      empty.style.cssText = "font-size:8px;color:#585858;grid-column:1/-1;";
      boxGrid.appendChild(empty);
    } else {
      myPokemon.box.forEach((mon) => boxGrid.appendChild(pokemonSlotEl(mon)));
    }

    adminControls.style.display = user.admin ? "block" : "none";
    addPokemonButton.disabled = myPokemon.party.length >= 6;
    addPokemonButton.style.background = addPokemonButton.disabled ? "#a0a0a0" : "#ec3750";
  }

  function renderBag() {
    showMenuTab("YOUR BAG", bagView, bagMenuButton);

    const ownedTypes = Array.from(
      new Set(
        myItems
          .map((ownedItem) => gameData.items[ownedItem.itemId]?.type)
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
    if (!ownedTypes.includes(selectedItemType)) {
      selectedItemType = ownedTypes[0] || null;
    }

    itemTypeTabs.innerHTML = "";
    ownedTypes.forEach((type) => {
      const typeButton = document.createElement("button");
      typeButton.type = "button";
      typeButton.textContent = type.toUpperCase();
      const selected = type === selectedItemType;
      typeButton.style.cssText =
        `padding:7px 9px;border:2px solid #383838;background:${selected ? "#338eda" : "#fff"};color:${selected ? "#fff" : "#383838"};font:7px 'Press Start 2P',monospace;cursor:pointer;`;
      typeButton.addEventListener("click", () => {
        selectedItemType = type;
        renderBag();
      });
      itemTypeTabs.appendChild(typeButton);
    });

    itemList.innerHTML = "";
    const visibleItems = myItems
      .filter((ownedItem) => gameData.items[ownedItem.itemId]?.type === selectedItemType)
      .sort((a, b) =>
        gameData.items[a.itemId].name.localeCompare(gameData.items[b.itemId].name)
      );

    if (visibleItems.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "Your bag is empty.";
      empty.style.cssText = "font-size:8px;color:#585858;line-height:1.7;padding:12px 0;";
      itemList.appendChild(empty);
    } else {
      visibleItems.forEach((ownedItem) => {
        const item = gameData.items[ownedItem.itemId];
        const row = document.createElement("div");
        row.style.cssText =
          "display:grid;grid-template-columns:minmax(120px,1fr) 3fr auto auto;gap:12px;align-items:center;background:#fff;border:2px solid #c0c0c0;padding:12px;";

        const itemName = document.createElement("div");
        itemName.textContent = item.name;
        itemName.style.cssText = "font-size:9px;line-height:1.5;";

        const itemDescription = document.createElement("div");
        itemDescription.textContent = item.description;
        itemDescription.style.cssText = "font-size:7px;color:#585858;line-height:1.7;";

        const quantity = document.createElement("div");
        quantity.textContent = `×${ownedItem.quantity}`;
        quantity.style.cssText = "font-size:10px;color:#ec3750;";

        // Keeps the USE column in place for items that can't be used from the bag.
        const useCell = document.createElement("div");
        if (item.bagUsable && window.BagItemEffects?.[ownedItem.itemId]) {
          const useButton = document.createElement("button");
          useButton.type = "button";
          useButton.textContent = "USE";
          useButton.style.cssText =
            "padding:8px 10px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";
          useButton.addEventListener("click", () => renderItemTargetPicker(ownedItem.itemId));
          useCell.appendChild(useButton);
        }

        row.appendChild(itemName);
        row.appendChild(itemDescription);
        row.appendChild(quantity);
        row.appendChild(useCell);
        itemList.appendChild(row);
      });
    }

    itemAdminControls.style.display = user.admin ? "block" : "none";
  }

  // Lists the party so the player can pick which Pokémon to use `itemId` on.
  function renderItemTargetPicker(itemId) {
    const item = gameData.items[itemId];
    showMenuTab(`USE ${item.name.toUpperCase()}`, bagView, bagMenuButton);
    itemTypeTabs.innerHTML = "";
    itemList.innerHTML = "";
    bagMessage.textContent = "";
    itemAdminControls.style.display = "none";

    const prompt = document.createElement("div");
    prompt.textContent = "Use on which Pokémon?";
    prompt.style.cssText = "font-size:8px;color:#585858;";

    const partyChoices = document.createElement("div");
    partyChoices.style.cssText = "display:grid;grid-template-columns:repeat(6,1fr);gap:8px;";
    if (myPokemon.party.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "Your party is empty.";
      empty.style.cssText = "font-size:8px;color:#585858;grid-column:1/-1;";
      partyChoices.appendChild(empty);
    }
    myPokemon.party.forEach((mon) =>
      partyChoices.appendChild(pokemonSlotEl(mon, (target) => useItem(itemId, target, partyChoices)))
    );

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "CANCEL";
    cancelButton.style.cssText =
      "justify-self:start;padding:8px 10px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;cursor:pointer;";
    cancelButton.addEventListener("click", () => {
      bagMessage.textContent = "";
      renderBag();
    });

    itemList.appendChild(prompt);
    itemList.appendChild(partyChoices);
    itemList.appendChild(cancelButton);
  }

  async function useItem(itemId, mon, partyChoices) {
    const item = gameData.items[itemId];
    partyChoices.querySelectorAll("button").forEach((button) => (button.disabled = true));
    bagMessage.style.color = "#585858";
    bagMessage.textContent = "Using...";

    try {
      const res = await fetch("api/my-items/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, pokemonId: mon.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Stay on the picker so another Pokémon can be chosen.
        bagMessage.style.color = "#ec3750";
        bagMessage.textContent = data.error || `Could not use ${item.name}.`;
        partyChoices.querySelectorAll("button").forEach((button) => (button.disabled = false));
        return;
      }

      // Mention moves the Pokémon can now learn; they're picked from its summary.
      const newMoves = (gameData.species[data.pokemon.speciesId]?.moves || [])
        .filter(
          (learnedMove) =>
            learnedMove.level > mon.level &&
            learnedMove.level <= data.pokemon.level &&
            !data.pokemon.moves.includes(learnedMove.move)
        )
        .map((learnedMove) => gameData.moves[learnedMove.move]?.name || learnedMove.move);

      await Promise.all([loadMyPokemon(), loadMyItems()]);
      renderBag();
      bagMessage.style.color = "#198754";
      bagMessage.textContent = data.message;
      if (newMoves.length > 0) {
        bagMessage.textContent += ` It can now learn ${newMoves.join(", ")}! Choose its moves from its summary.`;
      }
    } catch (err) {
      bagMessage.style.color = "#ec3750";
      bagMessage.textContent = "Connection error.";
      partyChoices.querySelectorAll("button").forEach((button) => (button.disabled = false));
    }
  }

  function renderShop() {
    showMenuTab("SHOP", shopView, shopMenuButton);
    shopList.innerHTML = "";

    [
      { shopType: "pokedollars", label: "POKÉDOLLAR ITEMS", currency: "P$" },
      { shopType: "watts", label: "WATT ITEMS", currency: "W" },
    ].forEach(({ shopType, label, currency }) => {
      const sectionLabel = document.createElement("div");
      sectionLabel.textContent = label;
      sectionLabel.style.cssText = "font-size:9px;color:#ec3750;margin:0 0 8px;";
      const section = document.createElement("div");
      section.style.cssText = "display:grid;gap:8px;margin-bottom:20px;";
      shopList.appendChild(sectionLabel);
      shopList.appendChild(section);

      const shopItems = Object.entries(gameData.items)
        .filter(([, item]) => item.shopType === shopType && Number.isInteger(item.shopPrice))
        .sort(([, a], [, b]) => a.shopPrice - b.shopPrice);

      if (shopItems.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "Nothing for sale.";
        empty.style.cssText = "font-size:8px;color:#585858;";
        section.appendChild(empty);
        return;
      }

      shopItems.forEach(([itemId, item]) => {
        const row = document.createElement("div");
        row.style.cssText =
          "display:grid;grid-template-columns:minmax(110px,1fr) 2fr auto auto auto;gap:10px;align-items:center;background:#fff;border:2px solid #c0c0c0;padding:12px;";

        const itemName = document.createElement("div");
        itemName.textContent = item.name;
        itemName.style.cssText = "font-size:9px;line-height:1.5;";

        const itemDescription = document.createElement("div");
        itemDescription.textContent = item.description;
        itemDescription.style.cssText = "font-size:7px;color:#585858;line-height:1.7;";

        const price = document.createElement("div");
        price.textContent = `${currency}${item.shopPrice.toLocaleString()}`;
        price.style.cssText = `font-size:9px;color:${shopType === "watts" ? "#338eda" : "#ec3750"};`;

        const quantityInput = document.createElement("input");
        quantityInput.type = "number";
        quantityInput.min = "1";
        quantityInput.max = "99";
        quantityInput.value = "1";
        quantityInput.setAttribute("aria-label", `${item.name} quantity`);
        quantityInput.style.cssText =
          "width:55px;padding:6px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;";

        const buyButton = document.createElement("button");
        buyButton.type = "button";
        buyButton.textContent = "BUY";
        buyButton.style.cssText =
          "padding:8px 10px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";
        buyButton.addEventListener("click", () =>
          buyItem(itemId, Number(quantityInput.value), buyButton)
        );

        row.appendChild(itemName);
        row.appendChild(itemDescription);
        row.appendChild(price);
        row.appendChild(quantityInput);
        row.appendChild(buyButton);
        section.appendChild(row);
      });
    });
  }

  const PROJECT_ICON_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  const MAX_PROJECT_ICON_BYTES = 256 * 1024;
  const FORM_FIELD_STYLE =
    "width:100%;box-sizing:border-box;padding:8px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;";

  function formatHackatimeTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  function projectsHint() {
    const hint = document.createElement("div");
    hint.textContent = "Press 1 or ESC to close";
    hint.style.cssText = "font-size:8px;color:#585858;margin-top:20px;text-align:center;";
    return hint;
  }

  async function openProjectsTab() {
    showMenuTab("YOUR PROJECTS", projectsView, projectsMenuButton);
    projectsView.innerHTML = "";
    const loading = document.createElement("div");
    loading.textContent = "Loading...";
    loading.style.cssText = "font-size:8px;color:#585858;";
    projectsView.appendChild(loading);

    await loadMyProjects();
    if (myProjects.hackatimeConnected) await loadHackatimeProjects();
    if (projectsView.style.display !== "none") renderProjects();
  }

  function renderProjects() {
    showMenuTab("YOUR PROJECTS", projectsView, projectsMenuButton);
    projectsView.innerHTML = "";

    if (!myProjects.hackatimeConnected) {
      const prompt = document.createElement("div");
      prompt.textContent =
        "Link your Hackatime account to track your coding projects.";
      prompt.style.cssText = "font-size:8px;color:#585858;line-height:1.8;margin-bottom:14px;";

      const linkButton = document.createElement("a");
      linkButton.href = "auth/hackatime";
      linkButton.textContent = "LINK HACKATIME";
      linkButton.style.cssText =
        "display:inline-block;padding:9px 12px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;text-decoration:none;";

      projectsView.appendChild(prompt);
      projectsView.appendChild(linkButton);
      projectsView.appendChild(projectsHint());
      return;
    }

    const list = document.createElement("div");
    list.style.cssText = "display:grid;gap:8px;margin-bottom:14px;";

    if (myProjects.projects.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "You have no projects yet.";
      empty.style.cssText = "font-size:8px;color:#585858;line-height:1.7;padding:12px 0;";
      list.appendChild(empty);
    }

    myProjects.projects.forEach((project) => {
      // The card holds the edit button plus a separate row of links, since links can't go inside a button.
      const card = document.createElement("div");
      card.style.cssText = "background:#fff;border:2px solid #c0c0c0;";
      card.addEventListener("mouseenter", () => (card.style.borderColor = "#383838"));
      card.addEventListener("mouseleave", () => (card.style.borderColor = "#c0c0c0"));

      const row = document.createElement("button");
      row.type = "button";
      row.setAttribute("aria-label", `Edit ${project.name}`);
      row.style.cssText =
        "display:flex;gap:12px;align-items:center;width:100%;text-align:left;background:none;border:none;padding:12px;color:#383838;font-family:'Press Start 2P',monospace;cursor:pointer;";
      row.addEventListener("click", () => renderProjectForm(project));

      const icon = document.createElement("img");
      icon.src = project.icon || pokemonPlaceholderSprite(project.name);
      icon.alt = "";
      icon.width = 40;
      icon.height = 40;
      icon.style.cssText = "flex-shrink:0;object-fit:cover;image-rendering:pixelated;";
      icon.onerror = () => {
        icon.onerror = null;
        icon.src = pokemonPlaceholderSprite(project.name);
      };

      const details = document.createElement("div");
      details.style.cssText = "min-width:0;";

      const name = document.createElement("div");
      name.textContent = project.name;
      name.style.cssText = "font-size:9px;line-height:1.5;word-break:break-word;";
      details.appendChild(name);

      if (project.description) {
        const description = document.createElement("div");
        description.textContent = project.description;
        description.style.cssText =
          "font-size:7px;color:#585858;line-height:1.7;margin-top:4px;word-break:break-word;";
        details.appendChild(description);
      }

      if (project.hackatimeProjects.length > 0) {
        const tracked = (hackatimeProjects || []).filter((hackatimeProject) =>
          project.hackatimeProjects.includes(hackatimeProject.name)
        );
        const hackatime = document.createElement("div");
        hackatime.textContent = `HACKATIME: ${project.hackatimeProjects.join(", ")}`;
        if (tracked.length > 0) {
          const totalSeconds = tracked.reduce((sum, { totalSeconds }) => sum + totalSeconds, 0);
          hackatime.textContent += ` · ${formatHackatimeTime(totalSeconds)}`;
        }
        hackatime.style.cssText =
          "font-size:6px;color:#338eda;line-height:1.7;margin-top:6px;word-break:break-word;";
        details.appendChild(hackatime);
      }

      row.appendChild(icon);
      row.appendChild(details);
      card.appendChild(row);

      const links = [
        { label: "CODE", url: project.codeUrl },
        { label: "PLAY", url: project.playableUrl },
      ].filter(({ url }) => url);
      if (links.length > 0) {
        const linkRow = document.createElement("div");
        linkRow.style.cssText = "display:flex;gap:8px;padding:0 12px 12px 64px;";
        links.forEach(({ label, url }) => {
          const link = document.createElement("a");
          link.href = url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = `${label} ↗`;
          link.style.cssText =
            "padding:6px 8px;border:2px solid #383838;background:#fff;color:#383838;font:7px 'Press Start 2P',monospace;text-decoration:none;";
          linkRow.appendChild(link);
        });
        card.appendChild(linkRow);
      }

      list.appendChild(card);
    });

    const addProjectButton = document.createElement("button");
    addProjectButton.type = "button";
    addProjectButton.textContent = "+ ADD PROJECT";
    addProjectButton.style.cssText =
      "padding:9px 12px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";
    addProjectButton.addEventListener("click", () => renderProjectForm());

    projectsView.appendChild(list);
    projectsView.appendChild(addProjectButton);
    projectsView.appendChild(projectsHint());
  }

  // Create a project, or edit `project` when one is given.
  function renderProjectForm(project = null) {
    showMenuTab(project ? "EDIT PROJECT" : "NEW PROJECT", projectsView, projectsMenuButton);
    projectsView.innerHTML = "";

    const form = document.createElement("form");
    form.style.cssText = "display:flex;flex-direction:column;gap:12px;";
    // Keep typing from reaching the game's hotkeys and movement keys; Escape still closes the menu.
    form.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") event.stopPropagation();
    });

    function field(labelText, input) {
      const label = document.createElement("label");
      label.style.cssText = "display:flex;flex-direction:column;gap:6px;font-size:8px;color:#ec3750;";
      label.appendChild(document.createTextNode(labelText));
      input.style.cssText = FORM_FIELD_STYLE;
      label.appendChild(input);
      form.appendChild(label);
      return input;
    }

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.required = true;
    nameInput.maxLength = 100;
    nameInput.value = project?.name || "";
    field("NAME *", nameInput);

    const descriptionInput = document.createElement("textarea");
    descriptionInput.rows = 3;
    descriptionInput.maxLength = 1000;
    descriptionInput.value = project?.description || "";
    field("DESCRIPTION", descriptionInput);
    descriptionInput.style.resize = "vertical";
    descriptionInput.style.lineHeight = "1.7";

    const codeUrlInput = document.createElement("input");
    codeUrlInput.type = "url";
    codeUrlInput.maxLength = 500;
    codeUrlInput.placeholder = "https://github.com/...";
    codeUrlInput.value = project?.codeUrl || "";
    field("CODE URL", codeUrlInput);

    const playableUrlInput = document.createElement("input");
    playableUrlInput.type = "url";
    playableUrlInput.maxLength = 500;
    playableUrlInput.placeholder = "https://...";
    playableUrlInput.value = project?.playableUrl || "";
    field("PLAYABLE URL", playableUrlInput);

    const iconInput = document.createElement("input");
    iconInput.type = "file";
    iconInput.accept = PROJECT_ICON_TYPES.join(",");
    field(project?.icon ? "NEW ICON (PNG/JPEG/GIF/WEBP, MAX 256 KB)" : "ICON (PNG/JPEG/GIF/WEBP, MAX 256 KB)", iconInput);

    // When editing a project that has an icon, show it with an option to remove it.
    const removeIconCheckbox = document.createElement("input");
    removeIconCheckbox.type = "checkbox";
    if (project?.icon) {
      const currentIcon = document.createElement("label");
      currentIcon.style.cssText =
        "display:flex;align-items:center;gap:10px;font-size:7px;color:#585858;cursor:pointer;";
      const preview = document.createElement("img");
      preview.src = project.icon;
      preview.alt = "Current icon";
      preview.width = 32;
      preview.height = 32;
      preview.style.cssText = "object-fit:cover;image-rendering:pixelated;border:2px solid #c0c0c0;";
      currentIcon.appendChild(preview);
      currentIcon.appendChild(removeIconCheckbox);
      currentIcon.appendChild(document.createTextNode("Remove current icon"));
      form.appendChild(currentIcon);
    }

    // Checkbox list of Hackatime projects. Linked names that Hackatime no longer
    // reports (e.g. renamed projects) are kept so they can still be unticked.
    const linkedNames = project?.hackatimeProjects || [];
    const hackatimeChoices = (hackatimeProjects || [])
      .map(({ name, totalSeconds }) => ({ name, detail: formatHackatimeTime(totalSeconds) }))
      .concat(
        linkedNames
          .filter((name) => !(hackatimeProjects || []).some((choice) => choice.name === name))
          .map((name) => ({ name, detail: "not found on Hackatime" }))
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    const hackatimeLabel = document.createElement("div");
    hackatimeLabel.textContent = "HACKATIME PROJECTS";
    hackatimeLabel.style.cssText = "font-size:8px;color:#ec3750;";

    const hackatimeList = document.createElement("div");
    hackatimeList.style.cssText =
      "display:grid;gap:4px;max-height:180px;overflow-y:auto;padding:6px;background:#fff;border:2px solid #383838;";

    const hackatimeCheckboxes = hackatimeChoices.map((choice) => {
      const option = document.createElement("label");
      option.style.cssText =
        "display:flex;align-items:center;gap:8px;padding:4px;font-size:7px;line-height:1.5;cursor:pointer;word-break:break-word;";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = choice.name;
      checkbox.checked = linkedNames.includes(choice.name);
      const text = document.createElement("span");
      text.textContent = `${choice.name} (${choice.detail})`;
      option.appendChild(checkbox);
      option.appendChild(text);
      hackatimeList.appendChild(option);
      return checkbox;
    });

    if (hackatimeChoices.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = hackatimeProjects
        ? "No Hackatime projects yet."
        : "Could not load your Hackatime projects.";
      empty.style.cssText = "font-size:7px;color:#585858;padding:4px;";
      hackatimeList.appendChild(empty);
    }

    form.appendChild(hackatimeLabel);
    form.appendChild(hackatimeList);

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:8px;";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "CANCEL";
    cancelButton.style.cssText =
      "padding:8px 10px;border:2px solid #383838;background:#fff;color:#383838;font:8px 'Press Start 2P',monospace;cursor:pointer;";
    cancelButton.addEventListener("click", renderProjects);

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.textContent = project ? "SAVE" : "CREATE";
    saveButton.style.cssText =
      "padding:8px 10px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

    const message = document.createElement("div");
    message.style.cssText = "min-height:12px;font-size:7px;color:#ec3750;line-height:1.5;";

    actions.appendChild(cancelButton);
    actions.appendChild(saveButton);

    form.appendChild(actions);
    form.appendChild(message);

    if (project) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "DELETE PROJECT";
      deleteButton.style.cssText =
        "align-self:flex-start;margin-top:4px;padding:8px 10px;border:2px solid #383838;background:#b42318;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

      deleteButton.addEventListener("click", async () => {
        if (!window.confirm(`Permanently delete ${project.name}? This cannot be undone.`)) {
          return;
        }

        deleteButton.disabled = true;
        saveButton.disabled = true;
        message.style.color = "#585858";
        message.textContent = "Deleting...";

        try {
          const response = await fetch(`api/my-projects/${project.id}`, { method: "DELETE" });
          const data = await response.json();
          if (!response.ok) {
            message.style.color = "#ec3750";
            message.textContent = data.error || "Could not delete project.";
            deleteButton.disabled = false;
            saveButton.disabled = false;
            return;
          }

          myProjects.projects = myProjects.projects.filter(({ id }) => id !== project.id);
          renderProjects();
        } catch (err) {
          message.style.color = "#ec3750";
          message.textContent = "Connection error.";
          deleteButton.disabled = false;
          saveButton.disabled = false;
        }
      });

      form.appendChild(deleteButton);
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const iconFile = iconInput.files[0];
      if (!nameInput.value.trim()) {
        message.style.color = "#ec3750";
        message.textContent = "Your project needs a name.";
        return;
      }
      if (iconFile && !PROJECT_ICON_TYPES.includes(iconFile.type)) {
        message.style.color = "#ec3750";
        message.textContent = "Icon must be a PNG, JPEG, GIF or WebP image.";
        return;
      }
      if (iconFile && iconFile.size > MAX_PROJECT_ICON_BYTES) {
        message.style.color = "#ec3750";
        message.textContent = "Icon must be 256 KB or smaller.";
        return;
      }

      saveButton.disabled = true;
      message.style.color = "#585858";
      message.textContent = "Saving...";

      try {
        const response = await fetch(project ? `api/my-projects/${project.id}` : "api/my-projects", {
          method: project ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameInput.value,
            description: descriptionInput.value,
            codeUrl: codeUrlInput.value,
            playableUrl: playableUrlInput.value,
            hackatimeProjects: hackatimeCheckboxes
              .filter((checkbox) => checkbox.checked)
              .map((checkbox) => checkbox.value),
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          message.style.color = "#ec3750";
          message.textContent = data.error || "Could not save project.";
          saveButton.disabled = false;
          return;
        }

        const savedProject = project ? Object.assign(project, data.project) : data.project;
        if (!project) myProjects.projects.push(savedProject);

        // Icon changes are separate requests: upload a new file, or remove the current one.
        let iconRequest = null;
        if (iconFile) {
          message.textContent = "Uploading icon...";
          iconRequest = fetch(`api/my-projects/${savedProject.id}/icon`, {
            method: "PUT",
            headers: { "Content-Type": iconFile.type },
            body: iconFile,
          });
        } else if (removeIconCheckbox.checked) {
          iconRequest = fetch(`api/my-projects/${savedProject.id}/icon`, { method: "DELETE" });
        }

        if (iconRequest) {
          const iconResponse = await iconRequest;
          const iconData = await iconResponse.json();
          if (!iconResponse.ok) {
            // The project is saved now, so show the list with the error rather than resubmitting.
            renderProjects();
            const iconError = document.createElement("div");
            iconError.textContent = `${savedProject.name} was saved, but its icon could not be updated: ${iconData.error || "unknown error"}`;
            iconError.style.cssText = "font-size:7px;color:#ec3750;line-height:1.5;margin-top:10px;";
            projectsView.insertBefore(iconError, projectsView.lastChild);
            return;
          }
          Object.assign(savedProject, iconData.project);
        }

        renderProjects();
      } catch (err) {
        message.style.color = "#ec3750";
        message.textContent = "Connection error.";
        saveButton.disabled = false;
      }
    });

    projectsView.appendChild(form);
    projectsView.appendChild(projectsHint());
    nameInput.focus();
  }

  // A form whose typing doesn't reach the game's hotkeys and movement keys; Escape still closes the menu.
  function menuForm() {
    const form = document.createElement("form");
    form.style.cssText = "display:flex;flex-direction:column;gap:12px;";
    form.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") event.stopPropagation();
    });
    return form;
  }

  function sectionLabel(text) {
    const label = document.createElement("div");
    label.textContent = text;
    label.style.cssText = "font-size:9px;color:#ec3750;";
    return label;
  }

  // Adds name fields, an ADDRESS section and birthday to `form`, filled in from `profile`.
  // Returns a function that reads the current values.
  function appendPersonalDetailsFields(form, profile) {
    const inputs = {};

    function textField(parent, key, labelText, maxLength) {
      const label = document.createElement("label");
      label.style.cssText =
        "display:flex;flex-direction:column;gap:6px;min-width:0;font-size:8px;color:#383838;";
      label.appendChild(document.createTextNode(labelText));
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = maxLength;
      input.value = profile?.[key] || "";
      input.style.cssText = FORM_FIELD_STYLE;
      label.appendChild(input);
      parent.appendChild(label);
      inputs[key] = input;
      return input;
    }

    function row() {
      const rowEl = document.createElement("div");
      rowEl.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;";
      return rowEl;
    }

    const nameRow = row();
    textField(nameRow, "firstName", "FIRST NAME", 100);
    textField(nameRow, "lastName", "LAST NAME", 100);
    form.appendChild(nameRow);

    const address = document.createElement("div");
    address.style.cssText =
      "display:flex;flex-direction:column;gap:12px;padding:12px;background:#fff;border:2px solid #c0c0c0;";
    address.appendChild(sectionLabel("ADDRESS"));
    textField(address, "addressLine1", "ADDRESS (LINE 1)", 200);
    textField(address, "addressLine2", "ADDRESS (LINE 2)", 200);
    const cityRow = row();
    textField(cityRow, "city", "CITY", 100);
    textField(cityRow, "state", "STATE / PROVINCE", 100);
    address.appendChild(cityRow);
    const countryRow = row();
    textField(countryRow, "country", "COUNTRY", 100);
    textField(countryRow, "postalCode", "ZIP / POSTAL CODE", 20);
    address.appendChild(countryRow);
    form.appendChild(address);

    const birthdayLabel = document.createElement("label");
    birthdayLabel.style.cssText = "display:flex;flex-direction:column;gap:6px;font-size:8px;color:#383838;";
    birthdayLabel.appendChild(document.createTextNode("BIRTHDAY"));
    const birthdayInput = document.createElement("input");
    birthdayInput.type = "date";
    birthdayInput.min = "1900-01-01";
    birthdayInput.max = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
    birthdayInput.value = profile?.birthday || "";
    birthdayInput.style.cssText = FORM_FIELD_STYLE;
    birthdayLabel.appendChild(birthdayInput);
    form.appendChild(birthdayLabel);
    inputs.birthday = birthdayInput;

    return () =>
      Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value]));
  }

  async function openProfileTab() {
    showMenuTab("YOUR PROFILE", profileView, profileMenuButton);
    profileView.innerHTML = "";
    const loading = document.createElement("div");
    loading.textContent = "Loading...";
    loading.style.cssText = "font-size:8px;color:#585858;";
    profileView.appendChild(loading);

    await loadMyProfile();
    if (profileView.style.display !== "none") renderProfile();
  }

  function renderProfile() {
    showMenuTab("YOUR PROFILE", profileView, profileMenuButton);
    profileView.innerHTML = "";

    const form = menuForm();

    // Character picker: Brendan or May, previewed with the first (facing down) frame.
    form.appendChild(sectionLabel("CHARACTER"));
    const characterRow = document.createElement("div");
    characterRow.style.cssText = "display:flex;gap:8px;";
    let selectedGender = myProfile?.gender || user.gender;
    const characterButtons = [
      { gender: "male", name: "BRENDAN", sprite: "assets/brendan.png" },
      { gender: "female", name: "MAY", sprite: "assets/may.png" },
    ].map(({ gender, name, sprite }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.gender = gender;
      button.setAttribute("aria-label", `Play as ${name}`);
      button.style.cssText =
        "display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 14px;border:2px solid #383838;font:8px 'Press Start 2P',monospace;cursor:pointer;";
      const preview = document.createElement("div");
      preview.style.cssText = `width:48px;height:48px;background:url(${sprite}) 0 0 / 192px 192px no-repeat;image-rendering:pixelated;`;
      button.appendChild(preview);
      button.appendChild(document.createTextNode(name));
      button.addEventListener("click", () => {
        selectedGender = gender;
        updateCharacterButtons();
      });
      characterRow.appendChild(button);
      return button;
    });
    function updateCharacterButtons() {
      characterButtons.forEach((button) => {
        const selected = button.dataset.gender === selectedGender;
        button.style.background = selected ? "#ec3750" : "#fff";
        button.style.color = selected ? "#fff" : "#383838";
        button.setAttribute("aria-pressed", String(selected));
      });
    }
    updateCharacterButtons();
    form.appendChild(characterRow);

    form.appendChild(sectionLabel("PERSONAL DETAILS"));
    const readDetails = appendPersonalDetailsFields(form, myProfile);

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.textContent = "SAVE PROFILE";
    saveButton.style.cssText =
      "align-self:flex-start;padding:8px 10px;border:2px solid #383838;background:#ec3750;color:#fff;font:8px 'Press Start 2P',monospace;cursor:pointer;";

    const message = document.createElement("div");
    message.style.cssText = "min-height:12px;font-size:7px;color:#ec3750;line-height:1.5;";

    form.appendChild(saveButton);
    form.appendChild(message);

    if (!myProfile) {
      message.textContent = "Could not load your profile. Saving will overwrite it.";
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      saveButton.disabled = true;
      message.style.color = "#585858";
      message.textContent = "Saving...";

      try {
        const response = await fetch("api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...readDetails(), gender: selectedGender }),
        });
        const data = await response.json();
        if (!response.ok) {
          message.style.color = "#ec3750";
          message.textContent = data.error || "Could not save profile.";
          return;
        }

        // The game switches the player's sprite when the server broadcasts the change.
        myProfile = data.profile;
        message.style.color = "#198754";
        message.textContent = "Profile saved.";
      } catch (err) {
        message.style.color = "#ec3750";
        message.textContent = "Connection error.";
      } finally {
        saveButton.disabled = false;
      }
    });

    profileView.appendChild(form);
    profileView.appendChild(projectsHint());
  }

  async function buyItem(itemId, quantity, buyButton) {
    const item = gameData.items[itemId];
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      shopMessage.style.color = "#ec3750";
      shopMessage.textContent = "Choose a quantity from 1 to 99.";
      return;
    }
    if (myCurrency[item.shopType] < item.shopPrice * quantity) {
      shopMessage.style.color = "#ec3750";
      shopMessage.textContent = `Not enough ${item.shopType === "watts" ? "Watts" : "Pokédollars"}.`;
      return;
    }

    buyButton.disabled = true;
    shopMessage.style.color = "#585858";
    shopMessage.textContent = "Buying...";
    try {
      const res = await fetch("api/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        shopMessage.style.color = "#ec3750";
        shopMessage.textContent = data.error || "Could not buy item.";
        return;
      }
      myCurrency = data.currency;
      renderCurrency();
      await loadMyItems();
      shopMessage.style.color = "#198754";
      shopMessage.textContent = `Bought ${quantity} ${item.name}.`;
    } catch (err) {
      shopMessage.style.color = "#ec3750";
      shopMessage.textContent = "Connection error.";
    } finally {
      buyButton.disabled = false;
    }
  }

  function populateSpeciesSelect() {
    speciesSelect.innerHTML = "";
    Object.entries(gameData.species)
      .sort(([, a], [, b]) => a.name.localeCompare(b.name))
      .forEach(([id, species]) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = species.name;
        speciesSelect.appendChild(option);
      });
  }

  function populateItemSelect() {
    itemSelect.innerHTML = "";
    Object.entries(gameData.items)
      .sort(([, a], [, b]) => a.name.localeCompare(b.name))
      .forEach(([id, item]) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = `${item.name} (${item.type})`;
        itemSelect.appendChild(option);
      });
  }

  pokemonMenuButton.addEventListener("click", renderPokemonMenu);
  bagMenuButton.addEventListener("click", () => {
    bagMessage.textContent = "";
    renderBag();
  });
  shopMenuButton.addEventListener("click", () => {
    shopMessage.textContent = "";
    renderShop();
  });
  projectsMenuButton.addEventListener("click", openProjectsTab);
  profileMenuButton.addEventListener("click", openProfileTab);

  addPokemonButton.addEventListener("click", async () => {
    if (!user.admin || !speciesSelect.value) return;
    addPokemonButton.disabled = true;
    adminMessage.style.color = "#585858";
    adminMessage.textContent = "Adding...";

    try {
      const res = await fetch("api/my-pokemon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speciesId: speciesSelect.value }),
      });
      const data = await res.json();
      if (!res.ok) {
        adminMessage.style.color = "#ec3750";
        adminMessage.textContent = data.error || "Could not add Pokémon.";
      } else {
        await loadMyPokemon();
        renderPokemonMenu();
        adminMessage.style.color = "#198754";
        adminMessage.textContent = "Pokémon added to your party.";
      }
    } catch (err) {
      adminMessage.style.color = "#ec3750";
      adminMessage.textContent = "Connection error.";
    } finally {
      addPokemonButton.disabled = myPokemon.party.length >= 6;
    }
  });

  addItemButton.addEventListener("click", async () => {
    const quantity = Number(itemQuantity.value);
    if (
      !user.admin ||
      !itemSelect.value ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 999
    ) {
      itemAdminMessage.style.color = "#ec3750";
      itemAdminMessage.textContent = "Choose a quantity from 1 to 999.";
      return;
    }

    addItemButton.disabled = true;
    itemAdminMessage.style.color = "#585858";
    itemAdminMessage.textContent = "Adding...";

    try {
      const res = await fetch("api/my-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: itemSelect.value, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        itemAdminMessage.style.color = "#ec3750";
        itemAdminMessage.textContent = data.error || "Could not add item.";
      } else {
        selectedItemType = gameData.items[itemSelect.value].type;
        await loadMyItems();
        renderBag();
        itemAdminMessage.style.color = "#198754";
        itemAdminMessage.textContent = "Item added to your bag.";
      }
    } catch (err) {
      itemAdminMessage.style.color = "#ec3750";
      itemAdminMessage.textContent = "Connection error.";
    } finally {
      addItemButton.disabled = false;
    }
  });

  async function loadMyPokemon() {
    try {
      const res = await fetch("api/my-pokemon");
      if (res.ok) {
        myPokemon = await res.json();
      }
    } catch (err) {
      // Keep whatever we had before; menu just renders as empty.
    }
  }

  async function loadMyItems() {
    try {
      const res = await fetch("api/my-items");
      if (res.ok) {
        const data = await res.json();
        myItems = data.items;
      }
    } catch (err) {
      // Keep the previous inventory if it cannot be refreshed.
    }
  }

  async function loadMyCurrency() {
    try {
      const res = await fetch("api/my-currency");
      if (res.ok) {
        myCurrency = await res.json();
      }
    } catch (err) {
      // Keep the previous balances if they cannot be refreshed.
    }
  }

  async function loadMyProjects() {
    try {
      const res = await fetch("api/my-projects");
      if (res.ok) {
        myProjects = await res.json();
      }
    } catch (err) {
      // Keep the previous projects if they cannot be refreshed.
    }
  }

  // Leaves myProfile null if it can't be loaded.
  async function loadMyProfile() {
    try {
      const res = await fetch("api/profile");
      if (res.ok) {
        myProfile = (await res.json()).profile;
      }
    } catch (err) {
      // Keep the previous profile if it cannot be refreshed.
    }
  }

  // Leaves hackatimeProjects null if Hackatime can't be reached.
  async function loadHackatimeProjects() {
    try {
      const res = await fetch("api/hackatime/projects");
      hackatimeProjects = res.ok ? (await res.json()).projects : null;
    } catch (err) {
      hackatimeProjects = null;
    }
  }

  async function openPokemonMenu() {
    onOpen();
    pokemonMenuOpen = true;
    await Promise.all([loadMyPokemon(), loadMyItems(), loadMyCurrency()]);
    renderCurrency();
    renderPokemonMenu();
    pokemonOverlay.style.display = "flex";
  }

  function closePokemonMenu() {
    pokemonMenuOpen = false;
    pokemonOverlay.style.display = "none";
    renderPokemonMenu();
  }

  function togglePokemonMenu() {
    if (pokemonMenuOpen) {
      closePokemonMenu();
    } else {
      openPokemonMenu();
    }
  }

  return {
    isOpen: () => pokemonMenuOpen,
    close: closePokemonMenu,
    toggle: togglePokemonMenu,
    populateAdminSelects: () => {
      populateSpeciesSelect();
      populateItemSelect();
    },
  };
}
