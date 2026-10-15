require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const cookieSession = require("cookie-session");
const crypto = require("crypto");
const pokemonData = require("./public/data/pokemon.json");
const itemData = require("./public/data/items.json");
const moveData = require("./public/data/moves.json");
const areaData = require("./public/data/area.json");
const { BagItemEffects } = require("./public/js/itemEffects.js");

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
const HACKATIME_CLIENT_ID = process.env.HACKATIME_CLIENT_ID;
const HACKATIME_CLIENT_SECRET = process.env.HACKATIME_CLIENT_SECRET;
const HACKATIME_URL = "https://hackatime.hackclub.com";
const HACKATIME_SCOPE = "profile read";
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
      lastPokemartId: user.lastPokemartId,
      needsStarter: !user.starterReceived,
      impersonating: Boolean(req.session.impersonatorId),
      hackatimeConnected: Boolean(user.hackatimeId),
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

// Start Hackatime OAuth flow (links Hackatime to the logged-in account)
app.get("/auth/hackatime", (req, res) => {
  if (!req.session.userId) {
    return res.redirect(`${BASE_URL}/?error=not_logged_in`);
  }
  if (!HACKATIME_CLIENT_ID) {
    return res.redirect(`${BASE_URL}/?error=hackatime_not_configured`);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  req.session.hackatimeState = state;
  req.session.hackatimeVerifier = codeVerifier;

  const params = new URLSearchParams({
    client_id: HACKATIME_CLIENT_ID,
    redirect_uri: `${BASE_URL}/auth/hackatime/callback`,
    response_type: "code",
    scope: HACKATIME_SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  res.redirect(`${HACKATIME_URL}/oauth/authorize?${params}`);
});

// Hackatime OAuth callback
app.get("/auth/hackatime/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const expectedState = req.session.hackatimeState;
  const codeVerifier = req.session.hackatimeVerifier;
  req.session.hackatimeState = null;
  req.session.hackatimeVerifier = null;

  if (!req.session.userId) {
    return res.redirect(`${BASE_URL}/?error=not_logged_in`);
  }
  if (error) {
    return res.redirect(`${BASE_URL}/?error=hackatime_denied`);
  }
  if (!code || !state || state !== expectedState) {
    return res.redirect(`${BASE_URL}/?error=hackatime_invalid_state`);
  }

  try {
    const tokenBody = new URLSearchParams({
      client_id: HACKATIME_CLIENT_ID,
      code,
      redirect_uri: `${BASE_URL}/auth/hackatime/callback`,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    });
    if (HACKATIME_CLIENT_SECRET) {
      tokenBody.set("client_secret", HACKATIME_CLIENT_SECRET);
    }
    const tokenRes = await fetch(`${HACKATIME_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody,
    });

    if (!tokenRes.ok) {
      console.error("Hackatime token exchange failed:", await tokenRes.text());
      return res.redirect(`${BASE_URL}/?error=hackatime_token_failed`);
    }

    const tokenData = await tokenRes.json();

    const meRes = await fetch(`${HACKATIME_URL}/api/v1/authenticated/me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!meRes.ok) {
      console.error("Hackatime user fetch failed:", await meRes.text());
      return res.redirect(`${BASE_URL}/?error=hackatime_user_fetch_failed`);
    }

    const meData = await meRes.json();
    const hackatimeId = String(meData.id);

    const linkedUser = await knex("users")
      .where({ hackatimeId })
      .whereNot({ id: req.session.userId })
      .first();
    if (linkedUser) {
      return res.redirect(`${BASE_URL}/?error=hackatime_already_linked`);
    }

    await knex("users").where({ id: req.session.userId }).update({
      hackatimeId,
      hackatimeAccessToken: tokenData.access_token,
      hackatimeScope: tokenData.scope || HACKATIME_SCOPE,
      hackatimeConnectedAt: knex.fn.now(),
      updated_at: knex.fn.now(),
    });

    res.redirect(`${BASE_URL}/?hackatime=connected`);
  } catch (err) {
    console.error("Hackatime OAuth error:", err);
    res.redirect(`${BASE_URL}/?error=hackatime_oauth_error`);
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
      lastPokemartId: user.lastPokemartId,
      needsStarter: !user.starterReceived,
      impersonating: Boolean(req.session.impersonatorId),
      hackatimeConnected: Boolean(user.hackatimeId),
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

// EXP needed to go from `level` to `level + 1`.
function expToLevelUp(speciesId, level) {
  return Math.max(1, Math.ceil(level * 0.2 * pokemonData[speciesId].stats.EXPRATE));
}

// EXP dropped by a defeated wild Pokémon found in `area`.
function wildExpReward(area, level) {
  return Math.max(1, Math.floor(level * area.encounterChance * 0.25));
}

function formatOwnedPokemon(row) {
  return {
    id: row.id,
    speciesId: row.speciesId,
    nickname: row.nickname,
    level: row.level,
    health: row.health,
    friendship: row.friendship,
    location: row.location,
    exp: row.exp,
    expToNextLevel: row.level < 100 ? expToLevelUp(row.speciesId, row.level) : null,
    slot: row.slot,
    moves: Array.isArray(row.moves) ? row.moves : [],
    status: row.status || null,
  };
}

// Status conditions a Pokémon can keep between battles (see status() in moveEffects.js).
const STATUS_NAMES = new Set(["burned", "frozen", "paralyzed", "poisoned", "asleep"]);

// Returns a clean { name, turns } status, null for no status, or undefined if invalid.
function parseStatus(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || !STATUS_NAMES.has(value.name)) return undefined;
  const turns = value.turns ?? null;
  if (turns !== null && (!Number.isInteger(turns) || turns < 1 || turns > 10)) return undefined;
  return { name: value.name, turns };
}

// Value to write to the user_pokemon.status jsonb column.
function statusColumn(status) {
  return status ? JSON.stringify(status) : null;
}

const STARTER_SPECIES = new Set([
  "charmander",
  "bulbasaur",
  "squirtle",
  "eevee",
  "pikachu",
]);

// Give an eligible user their one-time level 5 starter.
app.post("/api/starter", requireAuth, async (req, res) => {
  const { speciesId } = req.body;
  if (!STARTER_SPECIES.has(speciesId)) {
    return res.status(400).json({ error: "Invalid starter Pokémon" });
  }

  try {
    const pokemon = await knex.transaction(async (trx) => {
      const user = await trx("users")
        .where({ id: req.session.userId })
        .forUpdate()
        .first();

      if (user.starterReceived) {
        const err = new Error("Starter already received");
        err.status = 409;
        throw err;
      }

      // Users sent back through onboarding may already own Pokémon; a full party sends it to the box.
      const partyCount = await trx("user_pokemon")
        .where({ userId: user.id, location: "party" })
        .count("id as count")
        .first();
      const location = Number(partyCount.count) < 6 ? "party" : "box";

      const level = 5;
      const [row] = await trx("user_pokemon")
        .insert({
          userId: user.id,
          speciesId,
          location,
          slot: await nextFreeSlot(trx, user.id, location),
          level,
          health: maxHealthForLevel(speciesId, level),
          moves: JSON.stringify(knownMovesForLevel(speciesId, level)),
        })
        .returning("*");

      await trx("users").where({ id: user.id }).update({
        starterReceived: true,
        updated_at: trx.fn.now(),
      });

      return row;
    });

    res.status(201).json({ pokemon: formatOwnedPokemon(pokemon) });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
});

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

// Restore every Pokémon in the current user's party to full health and remember
// the Pokémart they healed at (where they return to after blacking out).
app.post("/api/my-pokemon/heal-party", requireAuth, async (req, res) => {
  const pokemartId = req.body?.pokemartId;
  if (typeof pokemartId !== "string" || !pokemartId || pokemartId.length > 255) {
    return res.status(400).json({ error: "Invalid Pokémart" });
  }

  const party = await knex.transaction(async (trx) => {
    await trx("users")
      .where({ id: req.session.userId })
      .update({ lastPokemartId: pokemartId, updated_at: trx.fn.now() });

    const rows = await trx("user_pokemon")
      .where({ userId: req.session.userId, location: "party" })
      .orderBy("slot", "asc")
      .forUpdate();
    for (const pokemon of rows) {
      pokemon.health = maxHealthForLevel(pokemon.speciesId, pokemon.level);
      pokemon.status = null;
      await trx("user_pokemon")
        .where({ id: pokemon.id, userId: req.session.userId })
        .update({ health: pokemon.health, status: null, updated_at: trx.fn.now() });
    }
    return rows;
  });

  res.json({ party: party.map(formatOwnedPokemon) });
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
  const uniqueMoves = new Set(selectedMoves);
  // Fewer than four is allowed so players can decline moves offered on level up.
  const isValidSelection =
    selectedMoves.length >= 1 &&
    selectedMoves.length <= 4 &&
    uniqueMoves.size === selectedMoves.length &&
    selectedMoves.every(
      (moveId) => typeof moveId === "string" && learnableMoves.includes(moveId)
    );

  if (!isValidSelection) {
    return res.status(400).json({
      error: "Choose 1 to 4 moves this Pokémon can learn",
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
    .update({ level, exp: 0, updated_at: knex.fn.now() })
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

// Get the current user's currency balances.
app.get("/api/my-currency", requireAuth, async (req, res) => {
  const user = await knex("users")
    .where({ id: req.session.userId })
    .select("pokedollars", "watts")
    .first();
  res.json({ pokedollars: user.pokedollars, watts: user.watts });
});

// Buy items listed in items.json with a shopPrice, paid in their shopType currency.
app.post("/api/shop/buy", requireAuth, async (req, res) => {
  const { itemId } = req.body;
  const quantity = Number(req.body?.quantity ?? 1);
  const item = itemData[itemId];
  if (
    typeof itemId !== "string" ||
    !Number.isInteger(item?.shopPrice) ||
    !["pokedollars", "watts"].includes(item.shopType)
  ) {
    return res.status(400).json({ error: "That item is not for sale" });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return res.status(400).json({ error: "Quantity must be a whole number from 1 to 99" });
  }

  const cost = item.shopPrice * quantity;
  try {
    const result = await knex.transaction(async (trx) => {
      const user = await trx("users")
        .where({ id: req.session.userId })
        .forUpdate()
        .first();
      if (user[item.shopType] < cost) {
        const error = new Error(
          `Not enough ${item.shopType === "watts" ? "Watts" : "Pokédollars"}`
        );
        error.status = 409;
        throw error;
      }

      const [balances] = await trx("users")
        .where({ id: user.id })
        .update({
          [item.shopType]: user[item.shopType] - cost,
          updated_at: trx.fn.now(),
        })
        .returning(["pokedollars", "watts"]);

      const [ownedItem] = await trx("user_items")
        .insert({ userId: user.id, itemId, quantity })
        .onConflict(["userId", "itemId"])
        .merge({
          quantity: trx.raw("user_items.quantity + ?", [quantity]),
          updated_at: trx.fn.now(),
        })
        .returning(["itemId", "quantity"]);

      return { item: ownedItem, currency: balances };
    });

    res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    throw error;
  }
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

// Use a bagUsable item from the bag on one of the current user's Pokémon. The
// effect itself lives in BagItemEffects (public/js/itemEffects.js).
app.post("/api/my-items/use", requireAuth, async (req, res) => {
  const { itemId } = req.body;
  const pokemonId = Number(req.body?.pokemonId);
  if (
    typeof itemId !== "string" ||
    !itemData[itemId]?.bagUsable ||
    !Object.hasOwn(BagItemEffects, itemId)
  ) {
    return res.status(400).json({ error: "That item can't be used here" });
  }
  if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
    return res.status(400).json({ error: "Invalid Pokémon" });
  }

  try {
    const result = await knex.transaction(async (trx) => {
      const item = await trx("user_items")
        .where({ userId: req.session.userId, itemId })
        .forUpdate()
        .first();
      if (!item || item.quantity < 1) {
        const error = new Error(`You don't have any ${itemData[itemId].name}`);
        error.status = 409;
        throw error;
      }

      const pokemon = await trx("user_pokemon")
        .where({ id: pokemonId, userId: req.session.userId })
        .forUpdate()
        .first();
      if (!pokemon) {
        const error = new Error("Pokémon not found");
        error.status = 404;
        throw error;
      }

      const target = {
        name: pokemon.nickname || pokemonData[pokemon.speciesId]?.name || pokemon.speciesId,
        level: pokemon.level,
        exp: pokemon.exp,
        health: pokemon.health,
        maxHealth: maxHealthForLevel(pokemon.speciesId, pokemon.level),
        status: pokemon.status || null,
        maxHealthForLevel: (level) => maxHealthForLevel(pokemon.speciesId, level),
      };
      const effect = BagItemEffects[itemId]({ target });
      if (!effect.used) {
        const error = new Error(effect.message);
        error.status = 400;
        throw error;
      }

      const [updatedPokemon] = await trx("user_pokemon")
        .where({ id: pokemon.id, userId: req.session.userId })
        .update({
          level: target.level,
          exp: target.exp,
          health: target.health,
          status: statusColumn(target.status),
          updated_at: trx.fn.now(),
        })
        .returning("*");

      if (item.quantity === 1) {
        await trx("user_items").where({ id: item.id }).del();
      } else {
        await trx("user_items")
          .where({ id: item.id })
          .update({ quantity: item.quantity - 1, updated_at: trx.fn.now() });
      }

      return {
        message: effect.message,
        pokemon: formatOwnedPokemon(updatedPokemon),
        item: { itemId, quantity: item.quantity - 1 },
      };
    });

    res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    throw error;
  }
});

// ─── Profile ───

// Text profile columns on users, with their max lengths.
const PROFILE_TEXT_FIELDS = {
  firstName: { label: "First name", max: 100 },
  lastName: { label: "Last name", max: 100 },
  addressLine1: { label: "Address (line 1)", max: 200 },
  addressLine2: { label: "Address (line 2)", max: 200 },
  city: { label: "City", max: 100 },
  state: { label: "State / Province", max: 100 },
  country: { label: "Country", max: 100 },
  postalCode: { label: "ZIP / Postal code", max: 20 },
};

// pg returns DATE columns as local-midnight Dates; turn them back into YYYY-MM-DD.
function formatDateOnly(value) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  const pad = (n) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function profileJson(user) {
  const profile = { gender: user.gender, birthday: formatDateOnly(user.birthday) };
  for (const field of Object.keys(PROFILE_TEXT_FIELDS)) profile[field] = user[field] || "";
  return profile;
}

// Validate profile fields from a request body. Fields that are missing from the body are
// left out; blank ones become null.
function parseProfileBody(body) {
  const fields = {};
  for (const [field, { label, max }] of Object.entries(PROFILE_TEXT_FIELDS)) {
    const value = body?.[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") throw httpError(400, `${label} must be text`);
    const trimmed = value.trim();
    if (trimmed.length > max) throw httpError(400, `${label} must be at most ${max} characters`);
    fields[field] = trimmed || null;
  }

  if (body?.birthday !== undefined && body?.birthday !== null) {
    const birthday = typeof body.birthday === "string" ? body.birthday.trim() : null;
    if (birthday) {
      const date = new Date(`${birthday}T00:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(birthday) ||
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== birthday ||
        birthday < "1900-01-01" ||
        date > new Date()
      ) {
        throw httpError(400, "Birthday must be a valid past date");
      }
    }
    fields.birthday = birthday || null;
  }

  if (body?.gender !== undefined) {
    if (!["male", "female"].includes(body.gender)) throw httpError(400, "Invalid character");
    fields.gender = body.gender;
  }

  return fields;
}

// Show a character change to everyone, including the user's other open tabs.
function broadcastCharacterChange(userId, gender) {
  for (const [socketId, socketUserId] of Object.entries(activeSockets)) {
    if (Number(socketUserId) !== userId || !players[socketId]) continue;
    players[socketId].gender = gender;
    io.emit("playerCharacterChanged", { id: socketId, gender });
  }
}

app.get("/api/profile", requireAuth, async (req, res) => {
  const user = await knex("users").where({ id: req.session.userId }).first();
  res.json({ profile: profileJson(user) });
});

// Update any of the profile fields and the character (gender).
app.patch("/api/profile", requireAuth, async (req, res) => {
  let fields;
  try {
    fields = parseProfileBody(req.body);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }

  const before = await knex("users").where({ id: req.session.userId }).first();
  const [user] = await knex("users")
    .where({ id: req.session.userId })
    .update({ ...fields, updated_at: knex.fn.now() })
    .returning("*");
  if (user.gender !== before.gender) broadcastCharacterChange(user.id, user.gender);

  res.json({ profile: profileJson(user) });
});

// ─── Projects ───

// Fetch the user's Hackatime projects with their stored token (needs the read scope).
async function fetchHackatimeProjects(accessToken) {
  const response = await fetch(`${HACKATIME_URL}/api/v1/authenticated/projects`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!response.ok) {
    console.error("Hackatime projects fetch failed:", await response.text());
    throw httpError(502, "Could not load your Hackatime projects");
  }
  const data = await response.json();
  return (data.projects || []).map((project) => ({
    name: project.name,
    totalSeconds: project.total_seconds || 0,
  }));
}

const PROJECT_COLUMNS = [
  "id",
  "name",
  "description",
  "iconType",
  "hackatimeProjects",
  "codeUrl",
  "playableUrl",
  "updated_at",
];
const MAX_PROJECT_ICON_BYTES = 256 * 1024;

function projectJson(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    // The version query lets the browser cache the icon until it changes.
    icon: row.iconType
      ? `api/projects/${row.id}/icon?v=${new Date(row.updated_at).getTime()}`
      : null,
    hackatimeProjects: row.hackatimeProjects || [],
    codeUrl: row.codeUrl,
    playableUrl: row.playableUrl,
  };
}

// Optional project link: blank becomes null; anything else must be an http(s) URL.
function parseProjectUrl(value, label) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw httpError(400, `${label} must be a URL`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw httpError(400, `${label} must be a valid URL`);
  }
  if (!["http:", "https:"].includes(url.protocol) || trimmed.length > 500) {
    throw httpError(400, `${label} must be an http(s) URL of at most 500 characters`);
  }
  return trimmed;
}

// Validate a create/edit body. Linked Hackatime projects must exist on the user's
// Hackatime account, except ones already linked (so renamed projects aren't lost).
async function parseProjectBody(body, user, alreadyLinked = []) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description =
    typeof body?.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const requested = body?.hackatimeProjects ?? [];

  if (!name || name.length > 100) {
    throw httpError(400, "Name must be 1 to 100 characters");
  }
  if (description && description.length > 1000) {
    throw httpError(400, "Description must be at most 1000 characters");
  }
  const codeUrl = parseProjectUrl(body?.codeUrl, "Code URL");
  const playableUrl = parseProjectUrl(body?.playableUrl, "Playable URL");
  if (
    !Array.isArray(requested) ||
    requested.length > 50 ||
    !requested.every((projectName) => typeof projectName === "string" && projectName)
  ) {
    throw httpError(400, "Hackatime projects must be a list of up to 50 project names");
  }

  const hackatimeProjects = Array.from(new Set(requested));
  const newlyLinked = hackatimeProjects.filter((projectName) => !alreadyLinked.includes(projectName));
  if (newlyLinked.length > 0) {
    const available = new Set(
      (await fetchHackatimeProjects(user.hackatimeAccessToken)).map((project) => project.name)
    );
    const missing = newlyLinked.find((projectName) => !available.has(projectName));
    if (missing) throw httpError(400, `Hackatime project "${missing}" was not found`);
  }

  return {
    name,
    description,
    codeUrl,
    playableUrl,
    hackatimeProjects: JSON.stringify(hackatimeProjects),
  };
}

// Detect the image type from the file's magic bytes rather than trusting the client.
function projectIconType(buffer) {
  if (buffer.length < 12) return null;
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 4).toString("ascii") === "GIF8") return "image/gif";
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

// List the user's projects, and whether they have linked Hackatime.
app.get("/api/my-projects", requireAuth, async (req, res) => {
  const user = await knex("users").where({ id: req.session.userId }).first();
  const rows = await knex("user_projects")
    .where({ userId: user.id })
    .select(PROJECT_COLUMNS)
    .orderBy("created_at", "asc");
  res.json({
    hackatimeConnected: Boolean(user.hackatimeId),
    projects: rows.map(projectJson),
  });
});

// List the user's Hackatime projects, for the project picker.
app.get("/api/hackatime/projects", requireAuth, async (req, res) => {
  const user = await knex("users").where({ id: req.session.userId }).first();
  if (!user.hackatimeAccessToken) {
    return res.status(409).json({ error: "Link your Hackatime account first" });
  }
  try {
    res.json({ projects: await fetchHackatimeProjects(user.hackatimeAccessToken) });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message });
  }
});

// Create a project. Only the name is required.
app.post("/api/my-projects", requireAuth, async (req, res) => {
  const user = await knex("users").where({ id: req.session.userId }).first();
  if (!user.hackatimeAccessToken) {
    return res.status(409).json({ error: "Link your Hackatime account first" });
  }

  let fields;
  try {
    fields = await parseProjectBody(req.body, user);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }

  const [project] = await knex("user_projects")
    .insert({ userId: user.id, ...fields })
    .returning(PROJECT_COLUMNS);

  res.status(201).json({ project: projectJson(project) });
});

// Edit a project's name, description and linked Hackatime projects.
app.patch("/api/my-projects/:id", requireAuth, async (req, res) => {
  const projectId = parseId(req.params.id);
  if (!projectId) return res.status(400).json({ error: "Invalid project" });

  const user = await knex("users").where({ id: req.session.userId }).first();
  const existing = await knex("user_projects")
    .where({ id: projectId, userId: user.id })
    .select("hackatimeProjects")
    .first();
  if (!existing) return res.status(404).json({ error: "Project not found" });
  if (!user.hackatimeAccessToken) {
    return res.status(409).json({ error: "Link your Hackatime account first" });
  }

  let fields;
  try {
    fields = await parseProjectBody(req.body, user, existing.hackatimeProjects || []);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }

  const [project] = await knex("user_projects")
    .where({ id: projectId, userId: user.id })
    .update({ ...fields, updated_at: knex.fn.now() })
    .returning(PROJECT_COLUMNS);

  res.json({ project: projectJson(project) });
});

// Delete a project.
app.delete("/api/my-projects/:id", requireAuth, async (req, res) => {
  const projectId = parseId(req.params.id);
  if (!projectId) return res.status(400).json({ error: "Invalid project" });

  const deleted = await knex("user_projects")
    .where({ id: projectId, userId: req.session.userId })
    .del();
  if (!deleted) return res.status(404).json({ error: "Project not found" });

  res.json({ ok: true });
});

// Remove a project's icon.
app.delete("/api/my-projects/:id/icon", requireAuth, async (req, res) => {
  const projectId = parseId(req.params.id);
  if (!projectId) return res.status(400).json({ error: "Invalid project" });

  const [project] = await knex("user_projects")
    .where({ id: projectId, userId: req.session.userId })
    .update({ iconData: null, iconType: null, updated_at: knex.fn.now() })
    .returning(PROJECT_COLUMNS);
  if (!project) return res.status(404).json({ error: "Project not found" });

  res.json({ project: projectJson(project) });
});

// Upload a project's icon. The body is the raw image file (PNG, JPEG, GIF or WebP).
app.put(
  "/api/my-projects/:id/icon",
  requireAuth,
  express.raw({ type: "image/*", limit: MAX_PROJECT_ICON_BYTES }),
  async (req, res) => {
    const projectId = parseId(req.params.id);
    if (!projectId) return res.status(400).json({ error: "Invalid project" });

    const iconType = Buffer.isBuffer(req.body) ? projectIconType(req.body) : null;
    if (!iconType) {
      return res.status(400).json({ error: "Icon must be a PNG, JPEG, GIF or WebP image" });
    }

    const [project] = await knex("user_projects")
      .where({ id: projectId, userId: req.session.userId })
      .update({ iconData: req.body, iconType, updated_at: knex.fn.now() })
      .returning(PROJECT_COLUMNS);
    if (!project) return res.status(404).json({ error: "Project not found" });

    res.json({ project: projectJson(project) });
  }
);

// Serve a project's icon image.
app.get("/api/projects/:id/icon", requireAuth, async (req, res) => {
  const projectId = parseId(req.params.id);
  const project = projectId
    ? await knex("user_projects")
        .where({ id: projectId })
        .select("iconData", "iconType")
        .first()
    : null;
  if (!project?.iconData) return res.status(404).end();

  res.set({
    "Content-Type": project.iconType,
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  res.send(project.iconData);
});

// express.raw rejects icons over the size limit before the route runs.
app.use("/api/my-projects", (err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Icon must be 256 KB or smaller" });
  }
  next(err);
});

// ─── Admin dashboard ───

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Lowest free party slot, or the slot after the last box Pokémon.
async function nextFreeSlot(trx, userId, location) {
  const rows = await trx("user_pokemon").where({ userId, location }).select("slot");
  if (location === "box") {
    return rows.reduce((max, row) => Math.max(max, row.slot + 1), 0);
  }
  if (rows.length >= 6) {
    throw httpError(409, "That party is full");
  }
  const usedSlots = new Set(rows.map((row) => row.slot));
  let slot = 0;
  while (usedSlots.has(slot)) slot++;
  return slot;
}

function onlineUserIds() {
  return new Set(Object.values(activeSockets).map(Number));
}

// List every account.
app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
  const users = await knex("users")
    .leftJoin("user_pokemon", "users.id", "user_pokemon.userId")
    .groupBy("users.id")
    .orderBy("users.id", "asc")
    .select(
      "users.id",
      "users.username",
      "users.email",
      "users.slackId",
      "users.gender",
      "users.admin",
      "users.pokedollars",
      "users.watts",
      "users.created_at"
    )
    .count("user_pokemon.id as pokemonCount");
  const online = onlineUserIds();

  res.json({
    users: users.map((user) => ({
      ...user,
      pokemonCount: Number(user.pokemonCount),
      online: online.has(user.id),
    })),
  });
});

// Full details for one account: Pokémon, items and recent chat history.
app.get("/api/admin/users/:userId", requireAuth, requireAdmin, async (req, res) => {
  const userId = parseId(req.params.userId);
  if (!userId) return res.status(400).json({ error: "Invalid user" });

  const user = await knex("users").where({ id: userId }).first();
  if (!user) return res.status(404).json({ error: "User not found" });

  const [pokemon, items, chat] = await Promise.all([
    knex("user_pokemon").where({ userId }).orderBy("slot", "asc"),
    knex("user_items").where({ userId }).orderBy("itemId", "asc"),
    knex("chat_messages")
      .where({ userId })
      .orderBy("created_at", "desc")
      .limit(200)
      .select("id", "message", "type", "created_at"),
  ]);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      slackId: user.slackId,
      gender: user.gender,
      admin: user.admin,
      pokedollars: user.pokedollars,
      watts: user.watts,
      created_at: user.created_at,
      online: onlineUserIds().has(user.id),
    },
    party: pokemon.filter((r) => r.location === "party").map(formatOwnedPokemon),
    box: pokemon.filter((r) => r.location === "box").map(formatOwnedPokemon),
    items: items.map((row) => ({ itemId: row.itemId, quantity: row.quantity })),
    chat,
  });
});

// Give a user a Pokémon.
app.post("/api/admin/users/:userId/pokemon", requireAuth, requireAdmin, async (req, res) => {
  const userId = parseId(req.params.userId);
  const { speciesId } = req.body ?? {};
  const level = Number(req.body?.level ?? 1);
  const location = req.body?.location === "box" ? "box" : "party";
  if (!userId) return res.status(400).json({ error: "Invalid user" });
  if (typeof speciesId !== "string" || !pokemonData[speciesId]) {
    return res.status(400).json({ error: "Invalid Pokémon species" });
  }
  if (!Number.isInteger(level) || level < 1 || level > 100) {
    return res.status(400).json({ error: "Level must be a whole number from 1 to 100" });
  }

  try {
    const pokemon = await knex.transaction(async (trx) => {
      const user = await trx("users").where({ id: userId }).forUpdate().first();
      if (!user) throw httpError(404, "User not found");

      const slot = await nextFreeSlot(trx, userId, location);
      const [row] = await trx("user_pokemon")
        .insert({
          userId,
          speciesId,
          location,
          slot,
          level,
          health: maxHealthForLevel(speciesId, level),
          moves: JSON.stringify(knownMovesForLevel(speciesId, level)),
        })
        .returning("*");
      return row;
    });
    res.status(201).json({ pokemon: formatOwnedPokemon(pokemon) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

// Edit a user's Pokémon. Accepts any of nickname, level, health, friendship, location.
app.patch("/api/admin/users/:userId/pokemon/:id", requireAuth, requireAdmin, async (req, res) => {
  const userId = parseId(req.params.userId);
  const pokemonId = parseId(req.params.id);
  if (!userId || !pokemonId) return res.status(400).json({ error: "Invalid Pokémon" });
  const body = req.body ?? {};

  try {
    const pokemon = await knex.transaction(async (trx) => {
      await trx("users").where({ id: userId }).forUpdate().first();
      const row = await trx("user_pokemon").where({ id: pokemonId, userId }).first();
      if (!row) throw httpError(404, "Pokémon not found");

      const changes = {};

      if ("nickname" in body) {
        const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
        if (nickname.length > 20) throw httpError(400, "Nickname must be 20 characters or fewer");
        changes.nickname = nickname || null;
      }

      let level = row.level;
      if ("level" in body) {
        level = Number(body.level);
        if (!Number.isInteger(level) || level < 1 || level > 100) {
          throw httpError(400, "Level must be a whole number from 1 to 100");
        }
        if (level !== row.level) {
          changes.level = level;
          changes.exp = 0;
        }
      }

      const maxHealth = maxHealthForLevel(row.speciesId, level);
      if ("health" in body) {
        const health = Number(body.health);
        if (!Number.isInteger(health) || health < 0 || health > maxHealth) {
          throw httpError(400, `Health must be a whole number from 0 to ${maxHealth}`);
        }
        changes.health = health;
      } else if (row.health > maxHealth) {
        changes.health = maxHealth;
      }

      if ("friendship" in body) {
        const friendship = Number(body.friendship);
        if (!Number.isInteger(friendship) || friendship < 0 || friendship > 255) {
          throw httpError(400, "Friendship must be a whole number from 0 to 255");
        }
        changes.friendship = friendship;
      }

      if ("location" in body && body.location !== row.location) {
        if (body.location !== "party" && body.location !== "box") {
          throw httpError(400, "Location must be party or box");
        }
        changes.location = body.location;
        changes.slot = await nextFreeSlot(trx, userId, body.location);
      }

      if (!Object.keys(changes).length) return row;
      const [updated] = await trx("user_pokemon")
        .where({ id: pokemonId, userId })
        .update({ ...changes, updated_at: trx.fn.now() })
        .returning("*");
      return updated;
    });
    res.json({ pokemon: formatOwnedPokemon(pokemon) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

// Delete a user's Pokémon.
app.delete("/api/admin/users/:userId/pokemon/:id", requireAuth, requireAdmin, async (req, res) => {
  const userId = parseId(req.params.userId);
  const pokemonId = parseId(req.params.id);
  if (!userId || !pokemonId) return res.status(400).json({ error: "Invalid Pokémon" });

  const deleted = await knex("user_pokemon").where({ id: pokemonId, userId }).del();
  if (!deleted) return res.status(404).json({ error: "Pokémon not found" });
  res.json({ ok: true });
});

// Set how many of an item a user has. A quantity of 0 removes it.
app.put("/api/admin/users/:userId/items/:itemId", requireAuth, requireAdmin, async (req, res) => {
  const userId = parseId(req.params.userId);
  const { itemId } = req.params;
  const quantity = Number(req.body?.quantity);
  if (!userId) return res.status(400).json({ error: "Invalid user" });
  if (!itemData[itemId]) return res.status(400).json({ error: "Invalid item" });
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999) {
    return res.status(400).json({ error: "Quantity must be a whole number from 0 to 999" });
  }

  const user = await knex("users").where({ id: userId }).first();
  if (!user) return res.status(404).json({ error: "User not found" });

  if (quantity === 0) {
    await knex("user_items").where({ userId, itemId }).del();
    return res.json({ item: { itemId, quantity: 0 } });
  }

  const [item] = await knex("user_items")
    .insert({ userId, itemId, quantity })
    .onConflict(["userId", "itemId"])
    .merge({ quantity, updated_at: knex.fn.now() })
    .returning(["itemId", "quantity"]);
  res.json({ item });
});

// Permanently delete an account and everything it owns.
app.delete("/api/admin/users/:userId", requireAuth, requireAdmin, async (req, res) => {
  const userId = parseId(req.params.userId);
  if (!userId) return res.status(400).json({ error: "Invalid user" });
  if (userId === req.session.userId) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }

  const deleted = await knex.transaction(async (trx) => {
    await trx("chat_messages").where({ userId }).del();
    await trx("user_items").where({ userId }).del();
    await trx("user_pokemon").where({ userId }).del();
    await trx("user_projects").where({ userId }).del();
    return trx("users").where({ id: userId }).del();
  });
  if (!deleted) return res.status(404).json({ error: "User not found" });

  // Kick the deleted user out of the game if they are online.
  for (const [socketId, socketUserId] of Object.entries(activeSockets)) {
    if (Number(socketUserId) !== userId) continue;
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit("forceLogout");
      socket.disconnect(true);
    }
  }

  res.json({ ok: true });
});

// Send a user back through onboarding (name/character setup and starter pick).
// Their Pokémon, items and progress are kept.
app.post("/api/admin/users/:userId/reset-onboarding", requireAuth, requireAdmin, async (req, res) => {
  const userId = parseId(req.params.userId);
  if (!userId) return res.status(400).json({ error: "Invalid user" });

  const updated = await knex("users").where({ id: userId }).update({
    username: null,
    starterReceived: false,
    updated_at: knex.fn.now(),
  });
  if (!updated) return res.status(404).json({ error: "User not found" });

  // Reload the user's open game so they land on the setup screen.
  for (const [socketId, socketUserId] of Object.entries(activeSockets)) {
    if (Number(socketUserId) !== userId) continue;
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit("forceLogout");
      socket.disconnect(true);
    }
  }

  res.json({ ok: true });
});

// Log in as another user. The admin's id is kept so they can switch back.
app.post("/api/admin/users/:userId/impersonate", requireAuth, requireAdmin, async (req, res) => {
  const userId = parseId(req.params.userId);
  if (!userId) return res.status(400).json({ error: "Invalid user" });
  if (userId === req.session.userId) {
    return res.status(400).json({ error: "You are already this user" });
  }

  const user = await knex("users").where({ id: userId }).first();
  if (!user) return res.status(404).json({ error: "User not found" });

  req.session.impersonatorId = req.session.impersonatorId || req.session.userId;
  req.session.userId = userId;
  res.json({ ok: true });
});

// Return to the admin account that started impersonating.
app.post("/api/admin/stop-impersonating", requireAuth, async (req, res) => {
  const impersonatorId = req.session.impersonatorId;
  if (!impersonatorId) {
    return res.status(400).json({ error: "You are not impersonating anyone" });
  }

  const admin = await knex("users").where({ id: impersonatorId }).first();
  if (!admin?.admin) {
    req.session = null;
    return res.status(403).json({ error: "Admin access required" });
  }

  req.session.userId = impersonatorId;
  req.session.impersonatorId = null;
  res.json({ ok: true });
});

// Persist the player-owned state produced by a completed battle.
app.post("/api/battle/results", requireAuth, async (req, res) => {
  const health = req.body?.health;
  const usedItems = req.body?.usedItems;
  const caughtPokemon = req.body?.caughtPokemon || null;
  const defeatedWild = req.body?.defeatedWild || null;
  const prizeMoney = Number(req.body?.prizeMoney ?? 0);
  if (
    !Array.isArray(health) ||
    !Array.isArray(usedItems) ||
    !Number.isInteger(prizeMoney) ||
    prizeMoney < 0 ||
    (defeatedWild && caughtPokemon)
  ) {
    return res.status(400).json({ error: "Invalid battle results" });
  }

  try {
    const result = await knex.transaction(async (trx) => {
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
        const status = parseStatus(result?.status);
        const maxHealth = pokemon
          ? maxHealthForLevel(pokemon.speciesId, pokemon.level)
          : -1;
        if (
          !pokemon ||
          !Number.isInteger(value) ||
          value < 0 ||
          value > maxHealth ||
          status === undefined
        ) {
          const error = new Error("Invalid Pokémon health result");
          error.status = 400;
          throw error;
        }
        // Fainting clears any status condition.
        const savedStatus = value > 0 ? status : null;
        await trx("user_pokemon")
          .where({ id: pokemon.id, userId: req.session.userId })
          .update({ health: value, status: statusColumn(savedStatus), updated_at: trx.fn.now() });
        pokemon.health = value;
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

      if (prizeMoney > 0) {
        await trx("users")
          .where({ id: req.session.userId })
          .update({
            pokedollars: trx.raw("users.pokedollars + ?", [prizeMoney]),
            updated_at: trx.fn.now(),
          });
      }

      let expGain = null;
      if (defeatedWild) {
        const area = areaData[defeatedWild.areaId];
        const wildLevel = Number(defeatedWild.level);
        const encounter = area?.pokemon.find(
          (candidate) => candidate.speciesId === defeatedWild.speciesId
        );
        const pokemon = partyById.get(Number(defeatedWild.pokemonId));
        if (
          !encounter ||
          !Number.isInteger(wildLevel) ||
          wildLevel < encounter.levelRange.min ||
          wildLevel > encounter.levelRange.max ||
          !pokemon
        ) {
          const error = new Error("Invalid defeated Pokémon");
          error.status = 400;
          throw error;
        }

        const exp = wildExpReward(area, wildLevel);
        const startLevel = pokemon.level;
        let level = pokemon.level;
        let totalExp = pokemon.exp + exp;
        while (level < 100 && totalExp >= expToLevelUp(pokemon.speciesId, level)) {
          totalExp -= expToLevelUp(pokemon.speciesId, level);
          level++;
        }
        if (level === 100) totalExp = 0;

        // Leveling up raises max health; keep the same amount of missing health.
        const healthGained =
          maxHealthForLevel(pokemon.speciesId, level) -
          maxHealthForLevel(pokemon.speciesId, startLevel);
        const [updatedPokemon] = await trx("user_pokemon")
          .where({ id: pokemon.id, userId: req.session.userId })
          .update({
            level,
            exp: totalExp,
            health: pokemon.health > 0 ? pokemon.health + healthGained : 0,
            updated_at: trx.fn.now(),
          })
          .returning("*");
        expGain = {
          exp,
          levelsGained: level - startLevel,
          pokemon: formatOwnedPokemon(updatedPokemon),
        };
      }

      if (!caughtPokemon) return { caught: null, expGain };
      const { speciesId, destination } = caughtPokemon;
      const level = Number(caughtPokemon.level);
      const caughtHealth = Number(caughtPokemon.health);
      const caughtStatus = parseStatus(caughtPokemon.status);
      const moves = caughtPokemon.moves;
      if (
        caughtStatus === undefined ||
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
          status: statusColumn(caughtStatus),
          moves: JSON.stringify(moves),
        })
        .returning("*");
      return { caught: formatOwnedPokemon(newPokemon), expGain };
    });

    res.json({ ok: true, caughtPokemon: result.caught, expGain: result.expGain });
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

    if (message.toLowerCase() === "/list") {
      const playerList = Object.values(players).map((p) => p.name);
      socket.emit("chatMessage", {
        username: "System",
        message: `Players online (${playerList.length}): ${playerList.join(", ")}`,
        type: "system",
        timestamp: Date.now(),
      });
      return;
    }

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
