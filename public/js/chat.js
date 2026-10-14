// ─── Chat UI ───
// Builds the chat log/input and handles slash commands.
// onOpen runs before the chat input opens (used to close other overlays).
function createChat({ socket, getOnlinePlayers, onOpen }) {
  let chatOpen = false;
  let chatMuted = false;
  const chatMessages = [];
  const maxChatMessages = 50;
  let chatFadeTimer = null;

  const chatContainer = document.createElement("div");
  chatContainer.id = "chat-container";
  chatContainer.style.cssText =
    "position:fixed;left:12px;top:50%;transform:translateY(-50%);width:360px;z-index:200;pointer-events:none;font-family:'Press Start 2P',monospace;";

  const chatLog = document.createElement("div");
  chatLog.id = "chat-log";
  chatLog.style.cssText =
    "max-height:160px;overflow-y:auto;padding:6px;pointer-events:auto;";

  const chatInputWrap = document.createElement("div");
  chatInputWrap.id = "chat-input-wrap";
  chatInputWrap.style.cssText =
    "display:none;background:rgba(0,0,0,0.85);border:2px solid #383838;padding:6px;pointer-events:auto;";

  const chatInput = document.createElement("input");
  chatInput.type = "text";
  chatInput.maxLength = 200;
  chatInput.placeholder = "Type a message...";
  chatInput.style.cssText =
    "width:100%;background:transparent;border:none;color:#fff;font-size:8px;font-family:'Press Start 2P',monospace;outline:none;";

  const chatHint = document.createElement("div");
  chatHint.textContent = "Press T to chat";
  chatHint.style.cssText =
    "font-size:8px;color:#fff;background:rgba(0,0,0,0.6);padding:6px 10px;pointer-events:none;";

  chatInputWrap.appendChild(chatInput);
  chatContainer.appendChild(chatLog);
  chatContainer.appendChild(chatHint);
  chatContainer.appendChild(chatInputWrap);
  document.body.appendChild(chatContainer);

  function sendPlayersListChat() {
    const players = getOnlinePlayers();
    const names = players.map((p) => p.name);
    appendChatMessage({
      message: `Players online (${players.length}): ${names.join(", ")}`,
      type: "system",
    });
  }

  const chatCommands = {
    mute: () => {
      chatMuted = !chatMuted;
      appendChatMessage({
        message: chatMuted ? "Chat muted." : "Chat unmuted.",
        type: "system",
      });
    },
    list: () => {
      sendPlayersListChat();
    },
    players: () => {
      sendPlayersListChat();
    },
    who: () => {
      sendPlayersListChat();
    },
  };

  function appendChatMessage(msg) {
    chatMessages.push(msg);
    if (chatMessages.length > maxChatMessages) chatMessages.shift();

    const el = document.createElement("div");
    el.style.cssText =
      "font-size:7px;padding:2px 4px;color:#fff;background:rgba(0,0,0,0.6);margin-bottom:1px;line-height:1.6;word-break:break-word;";

    if (msg.type === "system") {
      el.style.color = "#f1c40f";
      el.textContent = msg.message;
    } else {
      const nameSpan = document.createElement("span");
      nameSpan.style.color = "#5bc0de";
      nameSpan.textContent = msg.username + ": ";
      el.appendChild(nameSpan);
      el.appendChild(document.createTextNode(msg.message));
    }

    chatLog.appendChild(el);
    chatLog.scrollTop = chatLog.scrollHeight;

    // Show log, then schedule fade
    chatLog.style.opacity = "1";
    scheduleChatFade();
  }

  function scheduleChatFade() {
    if (chatOpen) return;
    clearTimeout(chatFadeTimer);
    chatFadeTimer = setTimeout(() => {
      if (!chatOpen) {
        chatLog.style.transition = "opacity 1s";
        chatLog.style.opacity = "0";
      }
    }, 5000);
  }

  function openChat() {
    onOpen();
    chatOpen = true;
    clearTimeout(chatFadeTimer);
    chatLog.style.transition = "none";
    chatLog.style.opacity = "1";
    chatInputWrap.style.display = "block";
    chatHint.remove();
    chatInput.focus();
  }

  function closeChat() {
    chatOpen = false;
    chatInputWrap.style.display = "none";
    chatInput.value = "";
    chatInput.blur();
    scheduleChatFade();
  }

  function sendChat() {
    const text = chatInput.value.trim();
    if (!text) {
      closeChat();
      return;
    }

    // Handle commands
    if (text.startsWith("/")) {
      const parts = text.slice(1).split(" ");
      const cmd = parts[0].toLowerCase();
      if (chatCommands[cmd]) {
        chatCommands[cmd](parts.slice(1));
      } else {
        appendChatMessage({
          message: `Unknown command: /${cmd}`,
          type: "system",
        });
      }
      chatInput.value = "";
      closeChat();
      return;
    }

    socket.emit("chatMessage", { message: text });
    chatInput.value = "";
    closeChat();
  }

  chatInput.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      sendChat();
    } else if (e.key === "Escape") {
      closeChat();
    } else if (e.key === "Tab") {
      e.preventDefault();
    }
  });

  socket.on("chatMessage", (msg) => {
    if (chatMuted && msg.type !== "system") return;
    appendChatMessage(msg);
  });

  return {
    isOpen: () => chatOpen,
    open: openChat,
    close: closeChat,
    appendMessage: appendChatMessage,
  };
}
