// ─── Online Players menu ───
// TAB overlay listing everyone currently online.
// onOpen runs before the menu opens (used to close other overlays).
function createPlayersMenu({ getOnlinePlayers, onOpen }) {
  let playersMenuOpen = false;

  const playersOverlay = document.createElement("div");
  playersOverlay.id = "players-menu-overlay";
  playersOverlay.style.cssText =
    "display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:300;justify-content:center;align-items:center;font-family:'Press Start 2P',monospace;";

  const playersPanel = document.createElement("div");
  playersPanel.style.cssText =
    "background:#f8f8f0;border:4px solid #383838;padding:20px;width:440px;max-width:90vw;max-height:80vh;overflow-y:auto;color:#383838;box-shadow:0 0 0 4px #f8f8f0;position:relative;";

  const playersHeader = document.createElement("div");
  playersHeader.style.cssText =
    "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;";

  const playersTitle = document.createElement("h2");
  playersTitle.style.cssText =
    "font-size:12px;letter-spacing:1px;color:#383838;margin:0;";

  const playersCloseBtn = document.createElement("button");
  playersCloseBtn.type = "button";
  playersCloseBtn.textContent = "✕";
  playersCloseBtn.style.cssText =
    "background:#ec3750;color:#fff;border:2px solid #383838;padding:4px 8px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;";
  playersCloseBtn.addEventListener("click", () => closePlayersMenu());

  playersHeader.appendChild(playersTitle);
  playersHeader.appendChild(playersCloseBtn);

  const playersDivider = document.createElement("div");
  playersDivider.style.cssText =
    "height:2px;background:#a0a0a0;margin-bottom:16px;";

  const playersListEl = document.createElement("div");
  playersListEl.id = "players-online-list";
  playersListEl.style.cssText =
    "display:flex;flex-direction:column;gap:8px;";

  const playersFooter = document.createElement("div");
  playersFooter.style.cssText =
    "margin-top:16px;text-align:center;font-size:7px;color:#787878;letter-spacing:1px;";
  playersFooter.textContent = "Press TAB or ESC to close";

  playersPanel.appendChild(playersHeader);
  playersPanel.appendChild(playersDivider);
  playersPanel.appendChild(playersListEl);
  playersPanel.appendChild(playersFooter);
  playersOverlay.appendChild(playersPanel);
  document.body.appendChild(playersOverlay);

  playersOverlay.addEventListener("click", (e) => {
    if (e.target === playersOverlay) {
      closePlayersMenu();
    }
  });

  function renderPlayersMenu() {
    const players = getOnlinePlayers();
    playersTitle.textContent = `ONLINE PLAYERS (${players.length})`;
    playersListEl.innerHTML = "";

    players.forEach((p) => {
      const item = document.createElement("div");
      item.style.cssText =
        `display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:2px solid #383838;background:${p.isSelf ? "#fff0f2" : "#fff"};`;

      const leftSide = document.createElement("div");
      leftSide.style.cssText = "display:flex;align-items:center;gap:12px;";

      const iconWrapper = document.createElement("div");
      iconWrapper.style.cssText =
        "width:32px;height:32px;overflow:hidden;position:relative;background:#e8e8e0;border:2px solid #383838;flex-shrink:0;";

      const icon = document.createElement("img");
      icon.src = p.gender === "female" ? "assets/may.png" : "assets/brendan.png";
      icon.alt = p.name;
      icon.style.cssText =
        "width:48px;height:48px;object-fit:none;object-position:0 0;image-rendering:pixelated;transform:scale(0.6667);transform-origin:0 0;display:block;";
      iconWrapper.appendChild(icon);

      const info = document.createElement("div");
      const nameRow = document.createElement("div");
      nameRow.style.cssText =
        `font-size:9px;color:${p.isSelf ? "#ec3750" : "#383838"};display:flex;align-items:center;gap:6px;`;
      nameRow.textContent = p.name;

      if (p.isSelf) {
        const youTag = document.createElement("span");
        youTag.textContent = "YOU";
        youTag.style.cssText =
          "font-size:6px;color:#fff;background:#ec3750;padding:2px 4px;border:1px solid #383838;";
        nameRow.appendChild(youTag);
      }

      const subText = document.createElement("div");
      subText.style.cssText = "font-size:7px;color:#787878;margin-top:4px;";
      subText.textContent = p.gender = "Trainer"; 

      info.appendChild(nameRow);
      info.appendChild(subText);

      leftSide.appendChild(iconWrapper);
      leftSide.appendChild(info);

      const statusTag = document.createElement("div");
      statusTag.style.cssText =
        "font-size:7px;color:#27ae60;display:flex;align-items:center;gap:4px;flex-shrink:0;";
      statusTag.innerHTML = `<span style="font-size:9px;line-height:1;">●</span> ONLINE`;

      item.appendChild(leftSide);
      item.appendChild(statusTag);

      playersListEl.appendChild(item);
    });
  }

  function openPlayersMenu() {
    onOpen();
    playersMenuOpen = true;
    renderPlayersMenu();
    playersOverlay.style.display = "flex";
  }

  function closePlayersMenu() {
    playersMenuOpen = false;
    playersOverlay.style.display = "none";
  }

  function togglePlayersMenu() {
    if (playersMenuOpen) {
      closePlayersMenu();
    } else {
      openPlayersMenu();
    }
  }

  return {
    isOpen: () => playersMenuOpen,
    close: closePlayersMenu,
    toggle: togglePlayersMenu,
    refresh: () => {
      if (playersMenuOpen) renderPlayersMenu();
    },
  };
}
