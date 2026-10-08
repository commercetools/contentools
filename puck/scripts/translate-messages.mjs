#!/usr/bin/env node
/**
 * Translate per-package intl catalogs with the Google Translate API.
 *
 * Reads every `packages/<pkg>/src/intl/en.json` (the English source of truth)
 * and writes a translated `<locale>.json` alongside it. ICU placeholders
 * (`{name}`) and rich-text tags (`<b>…</b>`) are masked before translation and
 * restored afterwards, so only human-readable text is ever sent to the
 * translator. If a translated segment loses a placeholder, that key falls back
 * to the English source and a warning is printed — placeholders are never
 * silently corrupted.
 *
 * By default only *missing* keys are translated (idempotent); existing
 * translations are preserved. Use --force to retranslate everything.
 *
 * Usage:
 *   # Official API (recommended) — set an API key, then:
 *   GOOGLE_TRANSLATE_API_KEY=xxx node scripts/translate-messages.mjs --locale es
 *
 *   # No key? Falls back to the free (unofficial, rate-limited) endpoint:
 *   node scripts/translate-messages.mjs --locale es
 *
 *   node scripts/translate-messages.mjs --locale es --force
 *   node scripts/translate-messages.mjs --locale es --package puck-page-manager
 *   node scripts/translate-messages.mjs --locale es --dry-run
 *
 * Flags:
 *   --locale <code>    Target locale/catalog to write (default: es)
 *   --source <code>    Source language (default: en)
 *   --package <name>   Only this package (repeatable); default: all
 *   --force            Retranslate keys that already exist
 *   --dry-run          Print what would change without writing files
 */

import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = join(__dirname, '..', 'packages');

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { locale: 'es', source: 'en', packages: [], force: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--locale') opts.locale = argv[++i];
    else if (a === '--source') opts.source = argv[++i];
    else if (a === '--package') opts.packages.push(argv[++i]);
    else if (a === '--force') opts.force = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Placeholder masking — protect ICU args ({name}) and tags (<b>…</b>)
// ---------------------------------------------------------------------------

const PLACEHOLDER_RE = /\{[^}]*\}|<[^>]+>/g;

function mask(text) {
  const tokens = [];
  const masked = text.replace(PLACEHOLDER_RE, (m) => {
    const i = tokens.length;
    tokens.push(m);
    return `[[${i}]]`;
  });
  return { masked, tokens };
}

function unmask(text, tokens) {
  let restored = 0;
  const out = text.replace(/\[\[\s*(\d+)\s*\]\]/g, (_, i) => {
    const token = tokens[Number(i)];
    if (token !== undefined) restored++;
    return token ?? '';
  });
  // A leftover "[[" means the translator mangled a sentinel.
  const ok = restored === tokens.length && !/\[\[/.test(out);
  return { out, ok };
}

// ---------------------------------------------------------------------------
// Translation backends
// ---------------------------------------------------------------------------

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

/**
 * Optional glossary of fixed translations for domain terms MT gets wrong
 * (e.g. "Slug" → "Slug", not "Babosa"). Keyed by locale then by the exact
 * English source string: `scripts/i18n-glossary.json` →
 * `{ "<locale>": { "<english>": "<translation>" } }`. Entries here bypass MT.
 */
async function loadGlossary(locale) {
  const p = join(__dirname, 'i18n-glossary.json');
  if (!(await exists(p))) return {};
  const all = JSON.parse(await readFile(p, 'utf8'));
  return all[locale] ?? {};
}

/** Path/anchor-like values ("/home", "#top") are identifiers, never translated. */
const isPathLike = (v) => /^[/#]\S*$/.test(v.trim());

/** Official Google Cloud Translation v2 — batches up to 100 segments per call. */
async function translateBatchOfficial(texts, source, target) {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts, source, target, format: 'text' }),
  });
  if (!res.ok) {
    throw new Error(`Google Translate API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.data.translations.map((t) => t.translatedText);
}

/** Free unofficial endpoint — one request per string, no key required. */
async function translateOneFree(text, source, target) {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx` +
    `&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Free endpoint ${res.status}`);
  const data = await res.json();
  // data[0] is an array of [translatedChunk, originalChunk, …]
  return data[0].map((seg) => seg[0]).join('');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translateAll(texts, source, target) {
  if (API_KEY) {
    const out = [];
    for (let i = 0; i < texts.length; i += 100) {
      out.push(...(await translateBatchOfficial(texts.slice(i, i + 100), source, target)));
    }
    return out;
  }
  // Free path: sequential with a small delay to avoid throttling.
  const out = [];
  for (const t of texts) {
    out.push(await translateOneFree(t, source, target));
    await sleep(120);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Per-package processing
// ---------------------------------------------------------------------------

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function findCatalogDirs(filterPackages) {
  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true });
  const dirs = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (filterPackages.length && !filterPackages.includes(e.name)) continue;
    const intlDir = join(PACKAGES_DIR, e.name, 'src', 'intl');
    if (await exists(join(intlDir, 'en.json'))) dirs.push({ pkg: e.name, intlDir });
  }
  return dirs;
}

async function processCatalog({ pkg, intlDir }, opts) {
  const source = JSON.parse(await readFile(join(intlDir, `${opts.source}.json`), 'utf8'));
  const targetPath = join(intlDir, `${opts.locale}.json`);
  const existing = (await exists(targetPath))
    ? JSON.parse(await readFile(targetPath, 'utf8'))
    : {};

  const stale = Object.keys(source).filter(
    (k) => opts.force || existing[k] === undefined
  );

  if (stale.length === 0) {
    console.log(`  ${pkg}: up to date (${Object.keys(source).length} keys)`);
    return;
  }

  // Resolve glossary hits and path-like identifiers locally; MT the rest.
  const resolved = {};
  const mtKeys = [];
  let glossaryHits = 0;
  for (const k of stale) {
    const sv = source[k];
    if (opts.glossary[sv] !== undefined) {
      resolved[k] = opts.glossary[sv];
      glossaryHits++;
    } else if (isPathLike(sv)) {
      resolved[k] = sv;
    } else {
      mtKeys.push(k);
    }
  }

  const masked = mtKeys.map((k) => mask(source[k]));
  const translated = masked.length
    ? await translateAll(masked.map((m) => m.masked), opts.source, opts.locale)
    : [];

  let warnings = 0;
  mtKeys.forEach((key, i) => {
    const { out, ok } = unmask(translated[i], masked[i].tokens);
    if (!ok) {
      warnings++;
      console.warn(`    ! ${key}: placeholder mismatch — kept English source`);
      resolved[key] = source[key];
    } else {
      resolved[key] = out;
    }
  });

  // Preserve en.json key order; keep prior translations for untouched keys.
  const result = {};
  for (const key of Object.keys(source)) {
    result[key] = key in resolved ? resolved[key] : existing[key];
  }

  console.log(
    `  ${pkg}: ${mtKeys.length} translated, ${glossaryHits} glossary, ` +
      `${stale.length - mtKeys.length - glossaryHits} path` +
      (warnings ? `, ${warnings} fallback(s)` : '')
  );

  if (!opts.dryRun) {
    await writeFile(targetPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  opts.glossary = await loadGlossary(opts.locale);
  console.log(
    `Translating ${opts.source} → ${opts.locale}` +
      (API_KEY ? ' (official API)' : ' (free endpoint — no API key set)') +
      (opts.force ? ' [force]' : '') +
      (opts.dryRun ? ' [dry-run]' : '')
  );

  const dirs = await findCatalogDirs(opts.packages);
  if (dirs.length === 0) {
    console.log('No intl catalogs found (looked for packages/*/src/intl/en.json).');
    return;
  }

  for (const dir of dirs) {
    await processCatalog(dir, opts);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
