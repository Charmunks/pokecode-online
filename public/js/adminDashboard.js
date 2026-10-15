// ─── Admin dashboard ───
// The "9" overlay (admins only): every account, and per account its Pokémon,
// items and chat history, with editing, deletion and impersonation.
// gameData holds the species/moves/items JSON loaded by game.js.
// onOpen runs before the dashboard opens (used to close other overlays).
function createAdminDashboard({ user, gameData, onOpen }) {
  let dashboardOpen = false;
  let accounts = [];
  let selectedUserId = null;
  let selectedTab = "pokemon";

  const FONT = "'Press Start 2P',monospace";
  const INPUT_STYLE =
    `padding:6px;border:2px solid #383838;color:#383838;background:#fff;font:8px ${FONT};`;

  function el(tag, cssText = "", text) {
    const node = document.createElement(tag);
    if (cssText) node.style.cssText = cssText;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, background = "#fff", color = "#383838") {
    const node = el(
      "button",
      `padding:7px 10px;border:2px solid #383838;background:${background};color:${color};font:8px ${FONT};cursor:pointer;`,
      text
    );
    node.type = "button";
    return node;
  }

  function numberInput(value, min, max, width = 60) {
    const input = el("input", `${INPUT_STYLE}width:${width}px;`);
    input.type = "number";
    input.min = String(min);
    input.max = String(max);
    input.step = "1";
    input.value = value;
    return input;
  }

  function labeled(label, input) {
    const wrapper = el("label", "display:flex;flex-direction:column;gap:4px;font-size:6px;color:#787878;");
    wrapper.appendChild(document.createTextNode(label));
    wrapper.appendChild(input);
    return wrapper;
  }

  function statusLine() {
    return el("div", "min-height:10px;font-size:7px;line-height:1.5;color:#585858;");
  }

  function setStatus(node, text, isError = false) {
    node.style.color = isError ? "#ec3750" : "#198754";
    node.textContent = text;
  }

  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  function placeholderSprite(label) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#a0a0a0"/><text x="32" y="42" font-size="28" font-family="monospace" fill="#fff" text-anchor="middle">${label.charAt(0).toUpperCase()}</text></svg>`;
    return "data:image/svg+xml;base64," + btoa(svg);
  }

  function formatTime(value) {
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ─── Layout ───

  const overlay = el(
    "div",
    `display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:300;justify-content:center;align-items:center;font-family:${FONT};`
  );
  overlay.id = "admin-dashboard-overlay";

  const panel = el(
    "div",
    "background:#f8f8f0;border:4px solid #383838;padding:20px;width:760px;max-width:94vw;max-height:86vh;overflow-y:auto;color:#383838;box-shadow:0 0 0 4px #f8f8f0;"
  );

  const header = el("div", "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;");
  const title = el("h2", "font-size:12px;letter-spacing:1px;margin:0;color:#ec3750;", "ADMIN DASHBOARD");
  const closeButton = button("✕", "#ec3750", "#fff");
  closeButton.addEventListener("click", () => closeDashboard());
  header.appendChild(title);
  header.appendChild(closeButton);

  const divider = el("div", "height:2px;background:#a0a0a0;margin-bottom:16px;");
  const content = el("div");
  const footer = el(
    "div",
    "margin-top:16px;text-align:center;font-size:7px;color:#787878;letter-spacing:1px;",
    "Press 9 or ESC to close"
  );

  panel.appendChild(header);
  panel.appendChild(divider);
  panel.appendChild(content);
  panel.appendChild(footer);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeDashboard();
  });

  // ─── Account list ───

  let searchTerm = "";

  async function showAccountList() {
    selectedUserId = null;
    title.textContent = "ADMIN DASHBOARD";
    content.innerHTML = "";

    const search = el("input", `${INPUT_STYLE}width:100%;margin-bottom:12px;`);
    search.type = "search";
    search.placeholder = "Search name, email or id...";
    search.value = searchTerm;
    const list = el("div", "display:flex;flex-direction:column;gap:6px;");
    const status = statusLine();
    content.appendChild(search);
    content.appendChild(status);
    content.appendChild(list);

    function renderList() {
      list.innerHTML = "";
      const term = searchTerm.toLowerCase();
      const matches = accounts.filter((account) =>
        [account.username, account.email, String(account.id)]
          .some((field) => field && field.toLowerCase().includes(term))
      );
      title.textContent = `ADMIN DASHBOARD (${accounts.length} ACCOUNTS)`;
      if (!matches.length) {
        list.appendChild(el("div", "font-size:8px;color:#787878;padding:12px 0;", "No accounts found."));
      }

      matches.forEach((account) => {
        const row = button("");
        row.style.cssText =
          `display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border:2px solid #383838;background:#fff;color:#383838;font-family:${FONT};cursor:pointer;text-align:left;width:100%;`;
        row.addEventListener("click", () => showAccount(account.id));

        const info = el("div", "display:flex;flex-direction:column;gap:5px;min-width:0;");
        const nameRow = el("div", "font-size:9px;display:flex;gap:6px;align-items:center;");
        nameRow.appendChild(document.createTextNode(account.username || "(no name yet)"));
        if (account.admin) {
          nameRow.appendChild(
            el("span", "font-size:6px;color:#fff;background:#ec3750;padding:2px 4px;border:1px solid #383838;", "ADMIN")
          );
        }
        info.appendChild(nameRow);
        info.appendChild(
          el(
            "div",
            "font-size:6px;color:#787878;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",
            `#${account.id} · ${account.email} · ${account.pokemonCount} POKÉMON`
          )
        );

        const online = el(
          "div",
          `font-size:7px;flex-shrink:0;color:${account.online ? "#27ae60" : "#a0a0a0"};`,
          account.online ? "● ONLINE" : "○ OFFLINE"
        );

        row.appendChild(info);
        row.appendChild(online);
        list.appendChild(row);
      });
    }

    search.addEventListener("input", () => {
      searchTerm = search.value;
      renderList();
    });

    status.textContent = "Loading...";
    try {
      accounts = (await api("api/admin/users")).users;
      status.textContent = "";
    } catch (err) {
      setStatus(status, err.message, true);
    }
    if (selectedUserId === null) renderList();
    search.focus();
  }

  // ─── Account detail ───

  async function showAccount(userId) {
    selectedUserId = userId;
    content.innerHTML = "";
    content.appendChild(el("div", "font-size:8px;color:#787878;", "Loading..."));

    let details;
    try {
      details = await api(`api/admin/users/${userId}`);
    } catch (err) {
      content.innerHTML = "";
      const backButton = button("◀ BACK");
      backButton.addEventListener("click", showAccountList);
      content.appendChild(backButton);
      content.appendChild(el("div", "font-size:8px;color:#ec3750;margin-top:12px;", err.message));
      return;
    }
    if (selectedUserId !== userId) return;
    renderAccount(details);
  }

  function renderAccount(details) {
    const account = details.user;
    title.textContent = (account.username || `ACCOUNT #${account.id}`).toUpperCase();
    content.innerHTML = "";

    const topRow = el("div", "display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:12px;");
    const backButton = button("◀ BACK");
    backButton.addEventListener("click", showAccountList);
    const actions = el("div", "display:flex;gap:8px;flex-wrap:wrap;");
    const onboardingButton = button("TEST ONBOARDING FLOW", "#ff8c37", "#fff");
    const impersonateButton = button("IMPERSONATE", "#338eda", "#fff");
    const deleteButton = button("DELETE ACCOUNT", "#ec3750", "#fff");
    const isSelf = account.id === user.id;
    impersonateButton.disabled = isSelf;
    deleteButton.disabled = isSelf;
    if (isSelf) {
      impersonateButton.style.opacity = "0.4";
      deleteButton.style.opacity = "0.4";
    }
    actions.appendChild(onboardingButton);
    actions.appendChild(impersonateButton);
    actions.appendChild(deleteButton);
    topRow.appendChild(backButton);
    topRow.appendChild(actions);

    const actionStatus = statusLine();

    const info = el(
      "div",
      "display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;padding:10px;background:#fff;border:2px solid #c0c0c0;margin-bottom:12px;font-size:7px;line-height:1.6;"
    );
    [
      ["ID", account.id],
      ["EMAIL", account.email],
      ["SLACK", account.slackId || "—"],
      ["GENDER", account.gender || "—"],
      ["POKÉDOLLARS", `₽${account.pokedollars}`],
      ["WATTS", `${account.watts}W`],
      ["JOINED", formatTime(account.created_at)],
      ["STATUS", `${account.online ? "ONLINE" : "OFFLINE"}${account.admin ? " · ADMIN" : ""}`],
    ].forEach(([label, value]) => {
      const cell = el("div", "min-width:0;overflow-wrap:anywhere;");
      cell.appendChild(el("div", "color:#787878;font-size:6px;", label));
      cell.appendChild(el("div", "", String(value)));
      info.appendChild(cell);
    });

    onboardingButton.addEventListener("click", async () => {
      const choice = await showChoiceDialog(
        `Send ${isSelf ? "yourself" : account.username || account.email} back through onboarding? Their name is cleared and they pick a name, character and starter again. Pokémon and items are kept.`,
        ["YES", "NO"]
      );
      if (choice !== "YES") return;
      try {
        await api(`api/admin/users/${account.id}/reset-onboarding`, { method: "POST" });
        if (isSelf) window.location.reload();
        else refresh();
      } catch (err) {
        setStatus(actionStatus, err.message, true);
      }
    });

    impersonateButton.addEventListener("click", async () => {
      const choice = await showChoiceDialog(
        `Log in as ${account.username || account.email}? You can switch back from the banner at the top of the screen.`,
        ["YES", "NO"]
      );
      if (choice !== "YES") return;
      try {
        await api(`api/admin/users/${account.id}/impersonate`, { method: "POST" });
        window.location.reload();
      } catch (err) {
        setStatus(actionStatus, err.message, true);
      }
    });

    deleteButton.addEventListener("click", async () => {
      const choice = await showChoiceDialog(
        `Permanently delete ${account.username || account.email} with all their Pokémon, items and chat history?`,
        ["DELETE", "CANCEL"]
      );
      if (choice !== "DELETE") return;
      try {
        await api(`api/admin/users/${account.id}`, { method: "DELETE" });
        showAccountList();
      } catch (err) {
        setStatus(actionStatus, err.message, true);
      }
    });

    const tabs = el("div", "display:flex;gap:8px;margin-bottom:12px;");
    const tabContent = el("div");
    const tabDefs = [
      ["pokemon", `POKÉMON (${details.party.length + details.box.length})`],
      ["items", `ITEMS (${details.items.length})`],
      ["chat", `CHAT (${details.chat.length})`],
    ];
    const tabButtons = tabDefs.map(([key, label]) => {
      const tabButton = button(label);
      tabButton.addEventListener("click", () => {
        selectedTab = key;
        renderTab();
      });
      tabs.appendChild(tabButton);
      return tabButton;
    });

    function renderTab() {
      tabDefs.forEach(([key], index) => {
        const active = key === selectedTab;
        tabButtons[index].style.background = active ? "#ec3750" : "#fff";
        tabButtons[index].style.color = active ? "#fff" : "#383838";
      });
      tabContent.innerHTML = "";
      if (selectedTab === "pokemon") renderPokemonTab(details, tabContent);
      else if (selectedTab === "items") renderItemsTab(details, tabContent);
      else renderChatTab(details, tabContent);
    }

    content.appendChild(topRow);
    content.appendChild(actionStatus);
    content.appendChild(info);
    content.appendChild(tabs);
    content.appendChild(tabContent);
    renderTab();
  }

  const refresh = () => showAccount(selectedUserId);

  // ─── Pokémon tab ───

  function renderPokemonTab(details, container) {
    const userId = details.user.id;

    const addForm = el(
      "form",
      "display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap;padding:10px;background:#fff;border:2px solid #c0c0c0;margin-bottom:12px;"
    );
    const speciesSelect = el("select", `${INPUT_STYLE}max-width:180px;`);
    Object.entries(gameData.species)
      .sort(([, a], [, b]) => (a.name || "").localeCompare(b.name || ""))
      .forEach(([id, species]) => {
        const option = el("option", "", species.name || id);
        option.value = id;
        speciesSelect.appendChild(option);
      });
    const levelInput = numberInput(5, 1, 100);
    const locationSelect = el("select", INPUT_STYLE);
    ["party", "box"].forEach((location) => {
      const option = el("option", "", location.toUpperCase());
      option.value = location;
      locationSelect.appendChild(option);
    });
    const addButton = button("ADD", "#ec3750", "#fff");
    addButton.type = "submit";
    const addStatus = statusLine();
    addForm.appendChild(labeled("SPECIES", speciesSelect));
    addForm.appendChild(labeled("LEVEL", levelInput));
    addForm.appendChild(labeled("LOCATION", locationSelect));
    addForm.appendChild(addButton);
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      addButton.disabled = true;
      try {
        await api(`api/admin/users/${userId}/pokemon`, {
          method: "POST",
          body: JSON.stringify({
            speciesId: speciesSelect.value,
            level: Number(levelInput.value),
            location: locationSelect.value,
          }),
        });
        refresh();
      } catch (err) {
        setStatus(addStatus, err.message, true);
        addButton.disabled = false;
      }
    });
    container.appendChild(addForm);
    container.appendChild(addStatus);

    [
      ["PARTY", details.party],
      ["BOX", details.box],
    ].forEach(([label, pokemonList]) => {
      container.appendChild(el("div", "font-size:9px;margin:12px 0 8px;", `${label} (${pokemonList.length})`));
      if (!pokemonList.length) {
        container.appendChild(el("div", "font-size:7px;color:#787878;", "Empty."));
      }
      pokemonList.forEach((mon) => container.appendChild(pokemonEditor(userId, mon)));
    });
  }

  function pokemonEditor(userId, mon) {
    const species = gameData.species[mon.speciesId] || {};
    const speciesName = species.name || mon.speciesId;

    const card = el(
      "form",
      "display:flex;gap:10px;align-items:flex-start;padding:10px;background:#fff;border:2px solid #383838;margin-bottom:8px;"
    );

    const img = el("img", "image-rendering:pixelated;flex-shrink:0;");
    img.width = 48;
    img.height = 48;
    img.src = species.mainSprite || "";
    img.onerror = () => {
      img.onerror = null;
      img.src = placeholderSprite(speciesName);
    };

    const body = el("div", "display:flex;flex-direction:column;gap:8px;flex:1;min-width:0;");
    body.appendChild(
      el("div", "font-size:8px;", `${speciesName} · #${mon.id} · EXP ${mon.exp ?? 0}/${mon.expToNextLevel ?? "—"}`)
    );

    const fields = el("div", "display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;");
    const nicknameInput = el("input", `${INPUT_STYLE}width:120px;`);
    nicknameInput.maxLength = 20;
    nicknameInput.placeholder = speciesName;
    nicknameInput.value = mon.nickname || "";
    const levelInput = numberInput(mon.level, 1, 100);
    const maxHealthAt = (level) =>
      species.stats ? pokemonStats(species, level).HP : mon.health;
    const healthInput = numberInput(mon.health, 0, maxHealthAt(mon.level), 70);
    const healthLabel = labeled(`HP (MAX ${maxHealthAt(mon.level)})`, healthInput);
    levelInput.addEventListener("input", () => {
      const level = Number(levelInput.value);
      if (!Number.isInteger(level) || level < 1 || level > 100) return;
      healthLabel.firstChild.textContent = `HP (MAX ${maxHealthAt(level)})`;
      healthInput.max = String(maxHealthAt(level));
    });
    const friendshipInput = numberInput(mon.friendship ?? 50, 0, 255);
    const locationSelect = el("select", INPUT_STYLE);
    ["party", "box"].forEach((location) => {
      const option = el("option", "", location.toUpperCase());
      option.value = location;
      locationSelect.appendChild(option);
    });
    locationSelect.value = mon.location;

    fields.appendChild(labeled("NICKNAME", nicknameInput));
    fields.appendChild(labeled("LEVEL", levelInput));
    fields.appendChild(healthLabel);
    fields.appendChild(labeled("FRIENDSHIP", friendshipInput));
    fields.appendChild(labeled("LOCATION", locationSelect));

    const buttons = el("div", "display:flex;gap:8px;align-items:center;");
    const saveButton = button("SAVE", "#ec3750", "#fff");
    saveButton.type = "submit";
    const deleteButton = button("DELETE");
    const status = statusLine();
    buttons.appendChild(saveButton);
    buttons.appendChild(deleteButton);
    buttons.appendChild(status);

    body.appendChild(fields);
    body.appendChild(buttons);
    card.appendChild(img);
    card.appendChild(body);

    card.addEventListener("submit", async (e) => {
      e.preventDefault();
      saveButton.disabled = true;
      status.style.color = "#585858";
      status.textContent = "Saving...";
      try {
        await api(`api/admin/users/${userId}/pokemon/${mon.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            nickname: nicknameInput.value,
            level: Number(levelInput.value),
            health: Number(healthInput.value),
            friendship: Number(friendshipInput.value),
            location: locationSelect.value,
          }),
        });
        refresh();
      } catch (err) {
        setStatus(status, err.message, true);
        saveButton.disabled = false;
      }
    });

    deleteButton.addEventListener("click", async () => {
      const choice = await showChoiceDialog(`Delete ${mon.nickname || speciesName}?`, ["DELETE", "CANCEL"]);
      if (choice !== "DELETE") return;
      try {
        await api(`api/admin/users/${userId}/pokemon/${mon.id}`, { method: "DELETE" });
        refresh();
      } catch (err) {
        setStatus(status, err.message, true);
      }
    });

    return card;
  }

  // ─── Items tab ───

  function setItemQuantity(userId, itemId, quantity) {
    return api(`api/admin/users/${userId}/items/${encodeURIComponent(itemId)}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    });
  }

  function renderItemsTab(details, container) {
    const userId = details.user.id;

    const addForm = el(
      "form",
      "display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap;padding:10px;background:#fff;border:2px solid #c0c0c0;margin-bottom:12px;"
    );
    const itemSelect = el("select", `${INPUT_STYLE}max-width:200px;`);
    Object.entries(gameData.items)
      .sort(([, a], [, b]) => (a.name || "").localeCompare(b.name || ""))
      .forEach(([id, item]) => {
        const option = el("option", "", item.name || id);
        option.value = id;
        itemSelect.appendChild(option);
      });
    const quantityInput = numberInput(1, 1, 999);
    const addButton = button("SET", "#ec3750", "#fff");
    addButton.type = "submit";
    const addStatus = statusLine();
    addForm.appendChild(labeled("ITEM", itemSelect));
    addForm.appendChild(labeled("QUANTITY", quantityInput));
    addForm.appendChild(addButton);
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      addButton.disabled = true;
      try {
        await setItemQuantity(userId, itemSelect.value, Number(quantityInput.value));
        refresh();
      } catch (err) {
        setStatus(addStatus, err.message, true);
        addButton.disabled = false;
      }
    });
    container.appendChild(addForm);
    container.appendChild(addStatus);

    if (!details.items.length) {
      container.appendChild(el("div", "font-size:7px;color:#787878;", "This bag is empty."));
    }

    details.items.forEach(({ itemId, quantity }) => {
      const row = el(
        "form",
        "display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fff;border:2px solid #383838;margin-bottom:6px;"
      );
      const name = el("div", "font-size:8px;flex:1;min-width:0;", gameData.items[itemId]?.name || itemId);
      const input = numberInput(quantity, 0, 999);
      input.setAttribute("aria-label", `${itemId} quantity`);
      const saveButton = button("SAVE", "#ec3750", "#fff");
      saveButton.type = "submit";
      const removeButton = button("REMOVE");
      const status = statusLine();
      status.style.minWidth = "80px";
      row.appendChild(name);
      row.appendChild(status);
      row.appendChild(input);
      row.appendChild(saveButton);
      row.appendChild(removeButton);

      async function save(newQuantity) {
        try {
          await setItemQuantity(userId, itemId, newQuantity);
          refresh();
        } catch (err) {
          setStatus(status, err.message, true);
        }
      }
      row.addEventListener("submit", (e) => {
        e.preventDefault();
        save(Number(input.value));
      });
      removeButton.addEventListener("click", () => save(0));
      container.appendChild(row);
    });
  }

  // ─── Chat tab ───

  function renderChatTab(details, container) {
    if (!details.chat.length) {
      container.appendChild(el("div", "font-size:7px;color:#787878;", "No chat messages."));
      return;
    }
    container.appendChild(
      el("div", "font-size:6px;color:#787878;margin-bottom:8px;", "Most recent 200 messages, newest first.")
    );
    const log = el("div", "display:flex;flex-direction:column;background:#fff;border:2px solid #383838;");
    details.chat.forEach((msg) => {
      const row = el(
        "div",
        "display:flex;gap:10px;padding:6px 8px;border-bottom:1px solid #e0e0e0;font-size:7px;line-height:1.6;"
      );
      row.appendChild(el("div", "color:#787878;flex-shrink:0;width:110px;", formatTime(msg.created_at)));
      row.appendChild(
        el(
          "div",
          `overflow-wrap:anywhere;color:${msg.type === "system" ? "#a0a0a0" : "#383838"};`,
          msg.message
        )
      );
      log.appendChild(row);
    });
    container.appendChild(log);
  }

  // ─── Open / close ───

  function openDashboard() {
    if (!user.admin) return;
    onOpen();
    dashboardOpen = true;
    overlay.style.display = "flex";
    if (selectedUserId === null) showAccountList();
    else showAccount(selectedUserId);
  }

  function closeDashboard() {
    dashboardOpen = false;
    overlay.style.display = "none";
  }

  function toggleDashboard() {
    if (dashboardOpen) closeDashboard();
    else openDashboard();
  }

  // While impersonating, show a banner to switch back to the admin account.
  if (user.impersonating) {
    const banner = el(
      "div",
      `position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:350;display:flex;align-items:center;gap:10px;padding:8px 12px;background:#338eda;color:#fff;border:2px solid #383838;border-top:none;font:8px ${FONT};`
    );
    banner.appendChild(el("span", "", `IMPERSONATING ${(user.username || "").toUpperCase()}`));
    const stopButton = button("STOP");
    stopButton.addEventListener("click", async () => {
      stopButton.disabled = true;
      try {
        await api("api/admin/stop-impersonating", { method: "POST" });
      } finally {
        window.location.reload();
      }
    });
    banner.appendChild(stopButton);
    document.body.appendChild(banner);
  }

  return {
    isOpen: () => dashboardOpen,
    close: closeDashboard,
    toggle: toggleDashboard,
  };
}
