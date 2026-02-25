/**
 * Seed script: loads all tokens/ JSON files into MongoDB as TokenCollection documents.
 *
 * Run via: yarn seed
 * Idempotent: safely re-runnable — existing collections are skipped.
 *
 * Environment: requires MONGODB_URI in .env.local (loaded via -r dotenv/config in npm script).
 */
import path from 'path';
import fs from 'fs';
import dbConnect from '../src/lib/mongodb';
import TokenCollection from '../src/lib/db/models/TokenCollection';

const TOKENS_DIR = path.join(process.cwd(), 'tokens');

function walkDir(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results;
}

function deriveCollectionName(filePath: string): string {
  const rel = path.relative(TOKENS_DIR, filePath);
  return rel.replace(/\.json$/, '').replace(/[/\\]/g, ' / ');
}

async function seed() {
  await dbConnect();
  const files = walkDir(TOKENS_DIR);
  let inserted = 0;
  let skipped = 0;

  for (const file of files) {
    const name = deriveCollectionName(file);
    const existing = await TokenCollection.findOne({ name });
    if (existing) {
      console.log(`[SKIP] "${name}" already exists`);
      skipped++;
      continue;
    }
    const raw = fs.readFileSync(file, 'utf-8');
    const tokens = JSON.parse(raw);
    await TokenCollection.create({ name, tokens, sourceMetadata: null, userId: null });
    console.log(`[INSERT] "${name}"`);
    inserted++;
  }

  console.log(`\nSeed complete: ${inserted} inserted, ${skipped} skipped`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
