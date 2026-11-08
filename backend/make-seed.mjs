import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import '../catalog.js';
import '../commerce.js';

const supplied = process.argv[2];
const input = supplied ? JSON.parse(readFileSync(supplied, 'utf8')) : globalThis.nornailsCatalog;
const products = (Array.isArray(input) ? input : input.products).map(globalThis.nornailsCommerce.product);
if (products.length > 500 || new Set(products.map(product => product.id)).size !== products.length) throw new Error('Invalid catalogue.');
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const sql = '-- Initial confirmed catalogue. No invented prices.\n' + products.map((product, index) => `INSERT OR IGNORE INTO products (id, data, position) VALUES (${quote(product.id)}, ${quote(JSON.stringify(product))}, ${index});`).join('\n') + '\n';
const output = new URL('migrations/0002_catalog.sql', import.meta.url);
if (supplied && existsSync(output) && !process.argv.includes('--replace-initial-seed')) throw new Error('To replace the INITIAL seed before first migration, pass --replace-initial-seed. Never rewrite a migration that has already been applied.');
writeFileSync(output, sql);
console.log(`Prepared the initial seed with ${products.length} products.`);
