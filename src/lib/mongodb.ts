import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'MONGODB_URI environment variable is not set. Copy .env.local.example to .env.local and set your MongoDB connection string.'
  );
}

// Extend global type for caching across hot-reloads in Next.js dev mode
declare global {
  var __mongoose_cache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

let cached = global.__mongoose_cache ?? { conn: null, promise: null };
global.__mongoose_cache = cached;

// Register connection lifecycle event handlers once
mongoose.connection.on('connected', () => {
  console.log('[MongoDB] Connected');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected');
});

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, { bufferCommands: false });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
