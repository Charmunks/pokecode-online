require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cookieSession = require("cookie-session");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const knex = require("knex")(
  require("./knexfile")[process.env.NODE_ENV || "development"]
);

// Run migrations on startup
knex.migrate.latest().then(() => {
  console.log("Database migrations complete");
});

const SESSION_SECRET = process.env.SESSION_SECRET || "pokecode-dev-secret-change-me";
const HC_CLIENT_ID = process.env.HC_CLIENT_ID;
const HC_CLIENT_SECRET = process.env.HC_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

app.use(express.json());
app.use(
  cookieSession({
    name: "session",
    keys: [SESSION_SECRET],
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  })
);

app.use(express.static(path.join(__dirname, "public")));

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// Get current user
app.get("/api/me", async (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }
  const user = await knex("users").where({ id: req.session.userId }).first();
  if (!user) {
    req.session = null;
    return res.json({ user: null });
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      slackId: user.slackId,
      username: user.username,
      gender: user.gender,
      x: user.x,
      y: user.y,
      direction: user.direction,
    },
  });
});

// Start OAuth flow
app.get("/auth/login", (req, res) => {
  const params = new URLSearchParams({
    client_id: HC_CLIENT_ID,
    redirect_uri: `${BASE_URL}/auth/callback`,
    response_type: "code",
    scope: "email slack_id",
  });
  res.redirect(`https://auth.hackclub.com/oauth/authorize?${params}`);
});

// OAuth callback
app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect("/?error=no_code");
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://auth.hackclub.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: HC_CLIENT_ID,
        client_secret: HC_CLIENT_SECRET,
        redirect_uri: `${BASE_URL}/auth/callback`,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return res.redirect("/?error=token_failed");
    }

    const tokenData = await tokenRes.json();

    // Get user info
    const meRes = await fetch("https://auth.hackclub.com/api/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!meRes.ok) {
      console.error("User info fetch failed:", await meRes.text());
      return res.redirect("/?error=user_fetch_failed");
    }

    const meData = await meRes.json();
    const identity = meData.identity;

    // Upsert user
    let user = await knex("users").where({ hackclubId: identity.id }).first();
    if (user) {
      await knex("users").where({ id: user.id }).update({
        email: identity.primary_email || user.email,
        slackId: identity.slack_id || user.slackId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        updated_at: knex.fn.now(),
      });
      user = await knex("users").where({ id: user.id }).first();
    } else {
      const [newUser] = await knex("users")
        .insert({
          hackclubId: identity.id,
          email: identity.primary_email,
          slackId: identity.slack_id,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
        })
        .returning("*");
      user = newUser;
    }

    req.session.userId = user.id;
    res.redirect("/");
  } catch (err) {
    console.error("OAuth error:", err);
    res.redirect("/?error=oauth_error");
  }
});

// Logout
app.post("/auth/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

// Set username and gender (after first login)
app.post("/api/setup", requireAuth, async (req, res) => {
  const { username, gender } = req.body;
  if (!username || username.trim().length === 0 || username.trim().length > 12) {
    return res.status(400).json({ error: "Username must be 1-12 characters" });
  }
  if (!["male", "female"].includes(gender)) {
    return res.status(400).json({ error: "Invalid gender" });
  }

  const trimmed = username.trim();

  // Check uniqueness
  const existing = await knex("users")
    .where({ username: trimmed })
    .whereNot({ id: req.session.userId })
    .first();
  if (existing) {
    return res.status(409).json({ error: "Username already taken" });
  }

  await knex("users").where({ id: req.session.userId }).update({
    username: trimmed,
    gender,
    updated_at: knex.fn.now(),
  });

  const user = await knex("users").where({ id: req.session.userId }).first();
  res.json({
    user: {
      id: user.id,
      email: user.email,
      slackId: user.slackId,
      username: user.username,
      gender: user.gender,
      x: user.x,
      y: user.y,
      direction: user.direction,
    },
  });
});

// Track which sockets belong to which user
const activeSockets = {}; // socketId -> userId
const players = {};

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("playerJoin", async (data) => {
    const { userId } = data;
    if (!userId) return;

    const user = await knex("users").where({ id: userId }).first();
    if (!user || !user.username) return;

    activeSockets[socket.id] = userId;

    players[socket.id] = {
      id: socket.id,
      name: user.username,
      gender: user.gender,
      x: user.x,
      y: user.y,
      direction: user.direction || "down",
      moving: false,
    };

    socket.emit("currentPlayers", players);
    socket.broadcast.emit("playerJoined", players[socket.id]);

    // Broadcast join message to all players
    const joinMsg = {
      username: user.username,
      message: `${user.username} joined the game!`,
      type: "system",
      timestamp: Date.now(),
    };
    io.emit("chatMessage", joinMsg);

    // Log join message to DB after broadcast
    knex("chat_messages")
      .insert({
        userId: userId,
        username: user.username,
        message: joinMsg.message,
        type: "system",
      })
      .catch((err) => console.error("Failed to log join message:", err));
  });

  socket.on("chatMessage", async (data) => {
    const player = players[socket.id];
    const userId = activeSockets[socket.id];
    if (!player || !userId || !data.message) return;

    const message = data.message.trim().slice(0, 200);
    if (!message) return;

    const msg = {
      username: player.name,
      message,
      type: "chat",
      timestamp: Date.now(),
    };
    io.emit("chatMessage", msg);

    // Log to DB after broadcast
    knex("chat_messages")
      .insert({
        userId,
        username: player.name,
        message,
        type: "chat",
      })
      .catch((err) => console.error("Failed to log chat message:", err));
  });

  socket.on("playerMove", async (data) => {
    if (!players[socket.id]) return;

    players[socket.id].x = data.x;
    players[socket.id].y = data.y;
    players[socket.id].direction = data.direction;
    players[socket.id].moving = data.moving;

    socket.broadcast.emit("playerMoved", {
      id: socket.id,
      x: data.x,
      y: data.y,
      direction: data.direction,
      moving: data.moving,
    });

    // Persist position to DB (throttled per socket via debounce)
    if (!socket._saveTimer) {
      socket._saveTimer = setTimeout(async () => {
        socket._saveTimer = null;
        const userId = activeSockets[socket.id];
        if (userId && players[socket.id]) {
          await knex("users").where({ id: userId }).update({
            x: players[socket.id].x,
            y: players[socket.id].y,
            direction: players[socket.id].direction,
          });
        }
      }, 2000);
    }
  });

  socket.on("disconnect", async () => {
    console.log(`Socket disconnected: ${socket.id}`);

    // Save final position
    const userId = activeSockets[socket.id];
    if (userId && players[socket.id]) {
      await knex("users").where({ id: userId }).update({
        x: players[socket.id].x,
        y: players[socket.id].y,
        direction: players[socket.id].direction,
      });
    }

    if (socket._saveTimer) {
      clearTimeout(socket._saveTimer);
    }

    delete activeSockets[socket.id];
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
