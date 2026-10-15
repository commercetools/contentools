#!/usr/bin/env node
// Compares the requests of the Postman collection with the route table of docs/api-reference.md.
// Zero dependencies. Exit 1 when the two sets differ.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COLLECTION = 'service/postman/contentools-api.postman_collection.json';
const REFERENCE = 'docs/api-reference.md';

/** Pure: `METHOD /path` ids of every request of a Postman collection (variables normalised to :bu / :key). */
export function collectionRoutes(collection) {
  const out = [];
  const walk = (items) => {
    for (const i of items) {
      if (i.item) { walk(i.item); continue; }
      const raw = typeof i.request.url === 'string' ? i.request.url : i.request.url.raw;
      const path = raw
        .replace(/^\{\{base_url\}\}/, '')
        .replace(/\?.*$/, '')
        .replace(/\{\{business_unit_key\}\}/g, ':bu')
        .replace(/\{\{[a-z_]+_key\}\}/g, ':key');
      out.push(`${i.request.method} ${path}`);
    }
  };
  walk(collection.item);
  return out;
}

/** Pure: `METHOD /path` ids of every row of the route table. */
export function referenceRoutes(markdown) {
  return markdown
    .split('\n')
    .map((l) => /^\|[^|]*\|\s*(GET|POST|PUT|DELETE)\s*\|\s*`([^`]+)`/.exec(l))
    .filter(Boolean)
    .map((m) => `${m[1]} ${m[2].replace(/\?.*$/, '')}`);
}

/** Pure: differences between two id lists. */
export function diff(fromCollection, fromReference) {
  const a = new Set(fromCollection);
  const b = new Set(fromReference);
  return {
    onlyInCollection: [...a].filter((x) => !b.has(x)).sort(),
    onlyInReference: [...b].filter((x) => !a.has(x)).sort(),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const collection = JSON.parse(readFileSync(join(ROOT, COLLECTION), 'utf8'));
  const fromCollection = collectionRoutes(collection);
  const fromReference = referenceRoutes(readFileSync(join(ROOT, REFERENCE), 'utf8'));
  const { onlyInCollection, onlyInReference } = diff(fromCollection, fromReference);
  if (onlyInCollection.length || onlyInReference.length) {
    for (const r of onlyInCollection) console.error(`only in the Postman collection: ${r}`);
    for (const r of onlyInReference) console.error(`only in ${REFERENCE}: ${r}`);
    process.exit(1);
  }
  console.log(`postman and api-reference agree (${new Set(fromReference).size} routes)`);
}
