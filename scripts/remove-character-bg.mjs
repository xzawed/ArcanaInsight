import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, '..');
const CHARACTERS_DIR = join(ROOT_DIR, 'public', 'images', 'characters');
const LOG_PATH = join(CHARACTERS_DIR, 'removal-log.json');
const REMOVE_BG_ENDPOINT = 'https://api.remove.bg/v1.0/removebg';
const REQUEST_DELAY_MS = 500;
const RATE_LIMIT_RETRY_MS = 1000;

const CHARACTER_IDS = [
  'arcana',
  'miko',
  'seonhwa',
  'hoshi',
  'luna',
  'rei',
  'cairn',
  'zero',
  'haru',
  'ren',
  'lix',
  'ethan',
];

const MOODS = ['default', 'idle', 'smile', 'serious', 'surprised', 'wink', 'mystical'];

class RemoveBgError extends Error {
  constructor(message, { status, detail } = {}) {
    super(message);
    this.name = 'RemoveBgError';
    this.status = status;
    this.detail = detail;
  }
}

function delay(ms) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}

function isValidCharacterId(characterId) {
  return CHARACTER_IDS.includes(characterId);
}

function isValidMood(mood) {
  return MOODS.includes(mood);
}

function formatError(error) {
  if (error instanceof RemoveBgError) {
    return error.detail ? `${error.message}: ${error.detail}` : error.message;
  }

  return error instanceof Error ? error.message : String(error);
}

async function parseErrorResponse(response) {
  try {
    const payload = await response.json();
    const firstError = payload?.errors?.[0];
    const title = firstError?.title ?? response.statusText;
    const detail = firstError?.detail;

    return { title, detail };
  } catch {
    return { title: response.statusText || `HTTP ${response.status}` };
  }
}

async function requestRemoveBackground(apiKey, imageBuffer) {
  const response = await fetch(REMOVE_BG_ENDPOINT, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
    },
    body: buildFormData(imageBuffer),
  });

  if (response.ok) {
    return Buffer.from(await response.arrayBuffer());
  }

  const { title, detail } = await parseErrorResponse(response);
  throw new RemoveBgError(title, { status: response.status, detail });
}

async function readLog() {
  try {
    const content = await readFile(LOG_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {};
    }

    throw error;
  }
}

async function writeLog(log) {
  await writeFile(LOG_PATH, `${JSON.stringify(log, null, 2)}\n`, 'utf8');
}

async function updateLog(entries) {
  const log = await readLog();
  const now = new Date().toISOString();

  for (const entry of entries) {
    const { characterId, mood, ...result } = entry;
    log[characterId] ??= {};
    log[characterId][mood] = {
      ...log[characterId][mood],
      ...result,
      updatedAt: now,
    };
  }

  await writeLog(log);
}

async function processImage(apiKey, characterId, mood) {
  const imagePath = getImagePath(characterId, mood);
  const startedAt = new Date().toISOString();

  try {
    const imageBuffer = await readFile(imagePath);
    const outputBuffer = await removeBackground(apiKey, imageBuffer);
    await writeFile(imagePath, outputBuffer);

    return {
      characterId,
      mood,
      status: 'success',
      path: imagePath,
      startedAt,
    };
  } catch (error) {
    if (error instanceof RemoveBgError && error.status === 402) {
      console.error('Credit exhausted — recharge Remove.bg account');
      process.exit(1);
    }

    const message = formatError(error);
    console.error(`[${characterId}/${mood}] failed: ${message}`);

    return {
      characterId,
      mood,
      status: 'failure',
      path: imagePath,
      error: message,
      startedAt,
    };
  }
}

function printSummary(summary) {
  console.log(
    `${summary.characterId}: ${summary.successes} success, ${summary.failures} failure`,
  );
}

function parseArgs(argv) {
  const [flag, characterId, mood] = argv;

  if (flag === '--pilot') {
    return { mode: 'pilot', characterIds: ['arcana'] };
  }

  if (flag === '--full') {
    return { mode: 'full', characterIds: CHARACTER_IDS };
  }

  if (flag === '--retry') {
    if (!isValidCharacterId(characterId) || !isValidMood(mood)) {
      throw new Error('Usage: --retry <characterId> <mood>');
    }

    return { mode: 'retry', characterId, mood };
  }

  throw new Error('Usage: --pilot | --full | --retry <characterId> <mood>');
}

export function getImagePath(characterId, mood) {
  return join(CHARACTERS_DIR, characterId, 'nukki', `${mood}.png`);
}

export function buildFormData(imageBuffer) {
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: 'image/png' });

  formData.append('image_file', blob, 'image.png');
  formData.append('size', 'auto');
  formData.append('format', 'png');
  formData.append('type', 'auto');

  return formData;
}

export async function removeBackground(apiKey, imageBuffer) {
  try {
    return await requestRemoveBackground(apiKey, imageBuffer);
  } catch (error) {
    if (error instanceof RemoveBgError && error.status === 429) {
      await delay(RATE_LIMIT_RETRY_MS);
      return requestRemoveBackground(apiKey, imageBuffer);
    }

    throw error;
  }
}

export async function processCharacter(apiKey, characterId) {
  const results = [];

  for (const mood of MOODS) {
    const result = await processImage(apiKey, characterId, mood);
    results.push(result);
    await delay(REQUEST_DELAY_MS);
  }

  await updateLog(results);

  const summary = {
    characterId,
    successes: results.filter((result) => result.status === 'success').length,
    failures: results.filter((result) => result.status === 'failure').length,
    results,
  };

  printSummary(summary);
  return summary;
}

async function main() {
  const apiKey = process.env.REMOVEBG_API_KEY;

  if (!apiKey) {
    console.error('REMOVEBG_API_KEY is required. Add it to .env.local or your environment.');
    process.exit(1);
  }

  let config;

  try {
    config = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(formatError(error));
    process.exit(1);
  }

  if (config.mode === 'retry') {
    const result = await processImage(apiKey, config.characterId, config.mood);
    await updateLog([result]);
    printSummary({
      characterId: config.characterId,
      successes: result.status === 'success' ? 1 : 0,
      failures: result.status === 'failure' ? 1 : 0,
    });
    return;
  }

  for (const characterId of config.characterIds) {
    await processCharacter(apiKey, characterId);
  }
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) {
  main().catch((error) => {
    console.error(formatError(error));
    process.exit(1);
  });
}
