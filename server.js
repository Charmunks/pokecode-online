require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const cookieSession = require("cookie-session");
const pokemonData = require("./public/data/pokemon.json");
const itemData = require("./public/data/items.json");
const moveData = require("./public/data/moves.json");

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
const configuredBaseUrl = process.env.BASE_URL || "http://localhost:3000";
const BASE_URL = new URL(
  /^https?:\/\//i.test(configuredBaseUrl)
    ? configuredBaseUrl
    : `https://${configuredBaseUrl}`
).toString().replace(/\/+$/, "");
const BASE_PATH = `${new URL(BASE_URL).pathname.replace(/\/+$/, "")}/`;
const publicDir = path.join(__dirname, "public");
const indexHtml = fs
  .readFileSync(path.join(publicDir, "index.html"), "utf8")
  .replace("__BASE_PATH__", BASE_PATH);

app.use(express.json());
app.use(
  cookieSession({
    name: "session",
    keys: [SESSION_SECRET],
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  })
);

app.get(["/", "/index.html"], (req, res) => {
  res.type("html").send(indexHtml);
});
app.use(express.static(publicDir, { index: false }));

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

async function requireAdmin(req, res, next) {
  const user = await knex("users").where({ id: req.session.userId }).first();
  if (!user?.admin) {
    return res.status(403).json({ error: "Admin access required" });
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
      admin: user.admin,
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
    return res.redirect(`${BASE_URL}/?error=no_code`);
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
      return res.redirect(`${BASE_URL}/?error=token_failed`);
    }

    const tokenData = await tokenRes.json();

    // Get user info
    const meRes = await fetch("https://auth.hackclub.com/api/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!meRes.ok) {
      console.error("User info fetch failed:", await meRes.text());
      return res.redirect(`${BASE_URL}/?error=user_fetch_failed`);
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
    res.redirect(`${BASE_URL}/`);
  } catch (err) {
    console.error("OAuth error:", err);
    res.redirect(`${BASE_URL}/?error=oauth_error`);
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
      admin: user.admin,
    },
  });
});

function learnableMovesForLevel(speciesId, level) {
  return (pokemonData[speciesId]?.moves || [])
    .filter((learnedMove) => learnedMove.level <= level)
    .map((learnedMove) => learnedMove.move);
}

function knownMovesForLevel(speciesId, level) {
  return learnableMovesForLevel(speciesId, level).slice(-4);
}

function maxHealthForLevel(speciesId, level) {
  const baseHp = pokemonData[speciesId].stats.HP;
  return Math.floor((baseHp * 2 * level) / 100) + level + 10;
}

function formatOwnedPokemon(row) {
  return {
    id: row.id,
    speciesId: row.speciesId,
    nickname: row.nickname,
    level: row.level,
    health: row.health,
    friendship: row.friendship,
    slot: row.slot,
    moves: Array.isArray(row.moves) ? row.moves : [],
  };
}

// Get the current user's Pokémon, split into party (max 6) and box
app.get("/api/my-pokemon", requireAuth, async (req, res) => {
  const rows = await knex("user_pokemon")
    .where({ userId: req.session.userId })
    .orderBy("slot", "asc");

  res.json({
    party: rows.filter((r) => r.location === "party").map(formatOwnedPokemon),
    box: rows.filter((r) => r.location === "box").map(formatOwnedPokemon),
  });
});

// Update the four moves known by one of the current user's Pokémon.
app.patch("/api/my-pokemon/:id/moves", requireAuth, async (req, res) => {
  const pokemonId = Number(req.params.id);
  const selectedMoves = req.body?.moves;
  if (!Number.isInteger(pokemonId) || pokemonId <= 0 || !Array.isArray(selectedMoves)) {
    return res.status(400).json({ error: "Invalid move selection" });
  }

  const pokemon = await knex("user_pokemon")
    .where({ id: pokemonId, userId: req.session.userId })
    .first();
  if (!pokemon) {
    return res.status(404).json({ error: "Pokémon not found" });
  }

  const learnableMoves = learnableMovesForLevel(pokemon.speciesId, pokemon.level);
  const requiredMoveCount = Math.min(4, learnableMoves.length);
  const uniqueMoves = new Set(selectedMoves);
  const isValidSelection =
    selectedMoves.length === requiredMoveCount &&
    uniqueMoves.size === selectedMoves.length &&
    selectedMoves.every(
      (moveId) => typeof moveId === "string" && learnableMoves.includes(moveId)
    );

  if (!isValidSelection) {
    return res.status(400).json({
      error: `Choose exactly ${requiredMoveCount} moves this Pokémon can learn`,
    });
  }

  const [updatedPokemon] = await knex("user_pokemon")
    .where({ id: pokemonId, userId: req.session.userId })
    .update({ moves: JSON.stringify(selectedMoves), updated_at: knex.fn.now() })
    .returning("*");

  res.json({ pokemon: formatOwnedPokemon(updatedPokemon) });
});

// Admins can update the level of one of their Pokémon.
app.patch("/api/my-pokemon/:id/level", requireAuth, requireAdmin, async (req, res) => {
  const pokemonId = Number(req.params.id);
  const level = Number(req.body?.level);
  if (
    !Number.isInteger(pokemonId) ||
    pokemonId <= 0 ||
    !Number.isInteger(level) ||
    level < 1 ||
    level > 100
  ) {
    return res.status(400).json({ error: "Level must be a whole number from 1 to 100" });
  }

  const [updatedPokemon] = await knex("user_pokemon")
    .where({ id: pokemonId, userId: req.session.userId })
    .update({ level, updated_at: knex.fn.now() })
    .returning("*");
  if (!updatedPokemon) {
    return res.status(404).json({ error: "Pokémon not found" });
  }

  res.json({ pokemon: formatOwnedPokemon(updatedPokemon) });
});

// Admins can update the health of one of their Pokémon.
app.patch("/api/my-pokemon/:id/health", requireAuth, requireAdmin, async (req, res) => {
  const pokemonId = Number(req.params.id);
  const health = Number(req.body?.health);
  if (!Number.isInteger(pokemonId) || pokemonId <= 0 || !Number.isInteger(health)) {
    return res.status(400).json({ error: "Health must be a whole number" });
  }

  const pokemon = await knex("user_pokemon")
    .where({ id: pokemonId, userId: req.session.userId })
    .first();
  if (!pokemon) {
    return res.status(404).json({ error: "Pokémon not found" });
  }

  const maxHealth = maxHealthForLevel(pokemon.speciesId, pokemon.level);
  if (health < 0 || health > maxHealth) {
    return res.status(400).json({
      error: `Health must be a whole number from 0 to ${maxHealth}`,
    });
  }

  const [updatedPokemon] = await knex("user_pokemon")
    .where({ id: pokemonId, userId: req.session.userId })
    .update({ health, updated_at: knex.fn.now() })
    .returning("*");

  res.json({ pokemon: formatOwnedPokemon(updatedPokemon) });
});

// Admins can add a Pokémon directly to their own party
app.post("/api/my-pokemon", requireAuth, requireAdmin, async (req, res) => {
  const { speciesId } = req.body;
  if (typeof speciesId !== "string" || !pokemonData[speciesId]) {
    return res.status(400).json({ error: "Invalid Pokémon species" });
  }

  try {
    const pokemon = await knex.transaction(async (trx) => {
      // Lock the user row so simultaneous requests cannot overfill the party.
      await trx("users").where({ id: req.session.userId }).forUpdate().first();

      const party = await trx("user_pokemon")
        .where({ userId: req.session.userId, location: "party" })
        .orderBy("slot", "asc");
      if (party.length >= 6) {
        const err = new Error("Your party is full");
        err.status = 409;
        throw err;
      }

      const usedSlots = new Set(party.map((row) => row.slot));
      let slot = 0;
      while (usedSlots.has(slot)) slot++;

      const [row] = await trx("user_pokemon")
        .insert({
          userId: req.session.userId,
          speciesId,
          location: "party",
          slot,
          health: maxHealthForLevel(speciesId, 1),
          moves: JSON.stringify(knownMovesForLevel(speciesId, 1)),
        })
        .returning("*");
      return row;
    });

    res.status(201).json({
      pokemon: formatOwnedPokemon(pokemon),
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
});

// Admins can delete one of their Pokémon.
app.delete("/api/my-pokemon/:id", requireAuth, requireAdmin, async (req, res) => {
  const pokemonId = Number(req.params.id);
  if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
    return res.status(400).json({ error: "Invalid Pokémon" });
  }

  const deleted = await knex("user_pokemon")
    .where({ id: pokemonId, userId: req.session.userId })
    .del();
  if (!deleted) {
    return res.status(404).json({ error: "Pokémon not found" });
  }

  res.json({ ok: true });
});

// Get the current user's item quantities. Item details live in items.json.
app.get("/api/my-items", requireAuth, async (req, res) => {
  const rows = await knex("user_items")
    .where({ userId: req.session.userId })
    .orderBy("itemId", "asc");

  res.json({
    items: rows.map((row) => ({
      itemId: row.itemId,
      quantity: row.quantity,
    })),
  });
});

// Admins can add one or more items to their own bag.
app.post("/api/my-items", requireAuth, requireAdmin, async (req, res) => {
  const { itemId } = req.body;
  const quantity = Number(req.body?.quantity ?? 1);
  if (typeof itemId !== "string" || !itemData[itemId]) {
    return res.status(400).json({ error: "Invalid item" });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    return res.status(400).json({ error: "Quantity must be a whole number from 1 to 999" });
  }

  const [item] = await knex("user_items")
    .insert({ userId: req.session.userId, itemId, quantity })
    .onConflict(["userId", "itemId"])
    .merge({
      quantity: knex.raw("user_items.quantity + ?", [quantity]),
      updated_at: knex.fn.now(),
    })
    .returning(["itemId", "quantity"]);

  res.status(201).json({ item });
});

// Persist the player-owned state produced by a completed battle.
app.post("/api/battle/results", requireAuth, async (req, res) => {
  const health = req.body?.health;
  const usedItems = req.body?.usedItems;
  const caughtPokemon = req.body?.caughtPokemon || null;
  if (!Array.isArray(health) || !Array.isArray(usedItems)) {
    return res.status(400).json({ error: "Invalid battle results" });
  }

  try {
    const caught = await knex.transaction(async (trx) => {
      const party = await trx("user_pokemon")
        .where({ userId: req.session.userId, location: "party" })
        .orderBy("slot", "asc")
        .forUpdate();
      const partyById = new Map(party.map((pokemon) => [pokemon.id, pokemon]));

      if (health.length !== party.length) {
        const error = new Error("The party changed during the battle");
        error.status = 409;
        throw error;
      }
      for (const result of health) {
        const pokemon = partyById.get(Number(result?.id));
        const value = Number(result?.health);
        const maxHealth = pokemon
          ? maxHealthForLevel(pokemon.speciesId, pokemon.level)
          : -1;
        if (!pokemon || !Number.isInteger(value) || value < 0 || value > maxHealth) {
          const error = new Error("Invalid Pokémon health result");
          error.status = 400;
          throw error;
        }
        await trx("user_pokemon")
          .where({ id: pokemon.id, userId: req.session.userId })
          .update({ health: value, updated_at: trx.fn.now() });
      }

      const itemTotals = new Map();
      for (const usedItem of usedItems) {
        const itemId = usedItem?.itemId;
        const quantity = Number(usedItem?.quantity);
        if (!itemData[itemId]?.battleUsable || !Number.isInteger(quantity) || quantity < 1) {
          const error = new Error("Invalid used item");
          error.status = 400;
          throw error;
        }
        itemTotals.set(itemId, (itemTotals.get(itemId) || 0) + quantity);
      }
      for (const [itemId, quantity] of itemTotals) {
        const item = await trx("user_items")
          .where({ userId: req.session.userId, itemId })
          .forUpdate()
          .first();
        if (!item || item.quantity < quantity) {
          const error = new Error(`Not enough ${itemData[itemId].name}`);
          error.status = 409;
          throw error;
        }
        if (item.quantity === quantity) {
          await trx("user_items").where({ id: item.id }).del();
        } else {
          await trx("user_items")
            .where({ id: item.id })
            .update({ quantity: item.quantity - quantity, updated_at: trx.fn.now() });
        }
      }

      if (!caughtPokemon) return null;
      const { speciesId, destination } = caughtPokemon;
      const level = Number(caughtPokemon.level);
      const caughtHealth = Number(caughtPokemon.health);
      const moves = caughtPokemon.moves;
      if (
        !pokemonData[speciesId] ||
        !["party", "box"].includes(destination) ||
        !Number.isInteger(level) ||
        level < 1 ||
        level > 100 ||
        !Number.isInteger(caughtHealth) ||
        caughtHealth < 1 ||
        caughtHealth > maxHealthForLevel(speciesId, level) ||
        !Array.isArray(moves) ||
        moves.length < 1 ||
        moves.length > 4 ||
        moves.some((moveId) => typeof moveId !== "string" || !moveData[moveId])
      ) {
        const error = new Error("Invalid caught Pokémon");
        error.status = 400;
        throw error;
      }
      if (destination === "party" && party.length >= 6) {
        const error = new Error("Your party is full");
        error.status = 409;
        throw error;
      }

      const destinationPokemon = await trx("user_pokemon")
        .where({ userId: req.session.userId, location: destination })
        .orderBy("slot", "asc");
      const usedSlots = new Set(destinationPokemon.map((pokemon) => pokemon.slot));
      let slot = 0;
      while (usedSlots.has(slot)) slot++;

      const [newPokemon] = await trx("user_pokemon")
        .insert({
          userId: req.session.userId,
          speciesId,
          location: destination,
          slot,
          level,
          health: caughtHealth,
          moves: JSON.stringify(moves),
        })
        .returning("*");
      return formatOwnedPokemon(newPokemon);
    });

    res.json({ ok: true, caughtPokemon: caught });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    throw error;
  }
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
