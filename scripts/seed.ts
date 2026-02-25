/**
 * Seed script: merges all tokens/ JSON files into a single MongoDB TokenCollection document.
 *
 * Run via: yarn seed
 * Idempotent: re-running replaces the existing "Design Tokens" document.
 *
 * Stored format: { [relativeFilePath]: tokenData } — matches TokenUpdater.getAllTokens() so
 * the same flatten logic works for both local and MongoDB token display.
 *
 * Environment: requires MONGODB_URI in .env.local (loaded via -r dotenv/config in npm script).
 */
import path from 'path';
import fs from 'fs';
import dbConnect from '../src/lib/mongodb';
import TokenCollection from '../src/lib/db/models/TokenCollection';

const TOKENS_DIR = path.join(process.cwd(), 'tokens');
const COLLECTION_NAME = 'Design Tokens';

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

async function seed() {
  await dbConnect();

  // Merge all token files into a single object keyed by relative path (e.g. "globals/color-base.json")
  const files = walkDir(TOKENS_DIR);
  const mergedTokens: Record<string, unknown> = {};

  for (const file of files) {
    const relPath = path.relative(TOKENS_DIR, file).replace(/\\/g, '/');
    mergedTokens[relPath] = JSON.parse(fs.readFileSync(file, 'utf-8'));
    console.log(`[MERGE] ${relPath}`);
  }

  console.log(`\nMerged ${files.length} files into "${COLLECTION_NAME}"`);

  // Replace existing document (delete + insert for idempotency)
  const deleted = await TokenCollection.deleteMany({ name: COLLECTION_NAME });
  if (deleted.deletedCount > 0) {
    console.log(`[REPLACE] Removed ${deleted.deletedCount} existing "${COLLECTION_NAME}" document(s)`);
  }

  await TokenCollection.create({ name: COLLECTION_NAME, tokens: mergedTokens, sourceMetadata: null, userId: null });
  console.log(`[INSERT] "${COLLECTION_NAME}" — ${files.length} token files`);

  console.log('\nSeed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
