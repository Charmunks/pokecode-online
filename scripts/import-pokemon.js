const fs = require('fs/promises');
const path = require('path');

const POKEAPI_URL = 'https://pokeapi.co/api/v2';
const FIRST_POKEMON_ID = 1;
const LAST_POKEMON_ID = 151;
const CONCURRENCY = 5;
const MAX_ATTEMPTS = 4;

const projectRoot = path.resolve(__dirname, '..');
const pokemonDataPath = path.join(projectRoot, 'public/data/pokemon.json');
const spriteDirectory = path.join(projectRoot, 'public/assets/pokemon');

const statKeys = {
  hp: 'HP',
  attack: 'ATTACK',
  'special-attack': 'SPA',
  'special-defense': 'SPD',
  speed: 'SPEED',
  defense: 'DEFENSE',
};

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(url) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response;

    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json, image/png',
          'User-Agent': 'pokecode-pokemon-importer/1.0',
        },
      });
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await delay(attempt * 1000);
      continue;
    }

    if (response.ok) return response;

    const error = new Error(`Request failed with status ${response.status}: ${url}`);
    if (response.status !== 429 && response.status < 500) throw error;
    lastError = error;

    if (attempt < MAX_ATTEMPTS) {
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfter = retryAfterHeader === null ? NaN : Number(retryAfterHeader);
      await delay(Number.isFinite(retryAfter) ? retryAfter * 1000 : attempt * 1000);
    }
  }

  throw lastError;
}

async function fetchJson(url) {
  const response = await fetchWithRetry(url);
  return response.json();
}

async function writeFileAtomic(destination, data) {
  const temporaryPath = `${destination}.${process.pid}.tmp`;

  try {
    await fs.writeFile(temporaryPath, data);
    await fs.rename(temporaryPath, destination);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
}

async function downloadSprite(url, destination) {
  if (!url) throw new Error(`PokeAPI did not provide a sprite for ${destination}`);

  const response = await fetchWithRetry(url);
  const sprite = Buffer.from(await response.arrayBuffer());
  await writeFileAtomic(destination, sprite);
}

function getStats(pokemon) {
  const stats = {};

  for (const { base_stat: value, stat } of pokemon.stats) {
    const key = statKeys[stat.name];
    if (key) stats[key] = value;
  }

  for (const key of Object.values(statKeys)) {
    if (!Number.isInteger(stats[key])) {
      throw new Error(`${pokemon.name} is missing the ${key} stat`);
    }
  }

  if (!Number.isInteger(pokemon.base_experience)) {
    throw new Error(`${pokemon.name} is missing its base experience`);
  }

  stats.EXPRATE = pokemon.base_experience;
  return stats;
}

function getRubySapphireMoves(pokemon) {
  const moves = new Map();

  for (const { move, version_group_details: details } of pokemon.moves) {
    for (const detail of details) {
      if (
        detail.version_group.name === 'ruby-sapphire' &&
        detail.move_learn_method.name === 'level-up'
      ) {
        const currentLevel = moves.get(move.name);
        if (currentLevel === undefined || detail.level_learned_at < currentLevel) {
          moves.set(move.name, detail.level_learned_at);
        }
      }
    }
  }

  return Array.from(moves, ([move, level]) => ({ move, level }))
    .sort((first, second) => first.level - second.level);
}

async function importPokemon(id) {
  const pokemon = await fetchJson(`${POKEAPI_URL}/pokemon/${id}`);
  const species = await fetchJson(pokemon.species.url);
  const rubySapphireSprites = pokemon.sprites.versions['generation-iii']['ruby-sapphire'];
  const filename = pokemon.name;

  await Promise.all([
    downloadSprite(
      rubySapphireSprites.front_default,
      path.join(spriteDirectory, `${filename}.png`),
    ),
    downloadSprite(
      rubySapphireSprites.back_default,
      path.join(spriteDirectory, `${filename}_battle.png`),
    ),
  ]);

  const englishName = species.names.find((name) => name.language.name === 'en');
  if (!englishName) throw new Error(`${pokemon.name} is missing its English name`);

  console.log(`Imported ${id}: ${englishName.name}`);

  return [
    pokemon.name,
    {
      name: englishName.name,
      mainSprite: `assets/pokemon/${filename}.png`,
      battleSprite: `assets/pokemon/${filename}_battle.png`,
      stats: getStats(pokemon),
      moves: getRubySapphireMoves(pokemon),
    },
  ];
}

async function main() {
  await fs.mkdir(spriteDirectory, { recursive: true });

  const entries = [];
  for (let id = FIRST_POKEMON_ID; id <= LAST_POKEMON_ID; id += CONCURRENCY) {
    const batch = Array.from(
      { length: Math.min(CONCURRENCY, LAST_POKEMON_ID - id + 1) },
      (_, offset) => importPokemon(id + offset),
    );
    entries.push(...(await Promise.all(batch)));
  }

  const pokemonData = Object.fromEntries(entries);
  await writeFileAtomic(pokemonDataPath, `${JSON.stringify(pokemonData, null, 2)}\n`);
  console.log(`Wrote ${entries.length} Pokémon to ${pokemonDataPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
