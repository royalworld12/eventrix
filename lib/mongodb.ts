import mongoose, { type ConnectOptions, type Mongoose } from "mongoose";

/**
 * In-memory connection cache.
 *
 * - `conn` holds the resolved Mongoose instance once the connection is ready.
 * - `promise` holds the *in-flight* `connect()` call so that concurrent callers share a
 *   single connection attempt instead of racing to open several of them.
 */
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

/**
 * In development the Next.js dev server re-evaluates modules on every edit (Fast Refresh),
 * which would otherwise create a brand-new connection pool per reload and exhaust MongoDB's
 * connection limit. Hanging the cache off `globalThis` keeps a single connection alive for
 * the whole server process, and in production (where the module is evaluated once) it is
 * simply a module-level cache.
 */
const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cached: MongooseCache = (globalForMongoose.mongooseCache ??= {
  conn: null,
  promise: null,
});

/**
 * Connection options tuned for the Next.js runtime.
 * Pools are per server instance, so keep them small and let the platform scale horizontally.
 */
const connectionOptions: ConnectOptions = {
  // Fail fast instead of buffering queries while disconnected (serverless behaviour).
  bufferCommands: false,
  // Upper bound on sockets opened by this instance.
  maxPoolSize: 10,
  // Allow idle instances to release every socket back to the server.
  minPoolSize: 0,
  // Recycle idle sockets before the server/cluster closes them on its side.
  maxIdleTimeMS: 10_000,
  // Give up quickly when the cluster cannot be reached during a cold start.
  serverSelectionTimeoutMS: 10_000,
  // Abort a query that hangs instead of holding the request open forever.
  socketTimeoutMS: 45_000,
};

/**
 * Returns a cached Mongoose connection, creating it on first call.
 *
 * Safe to call from anywhere on the server (Route Handlers, Server Components, Server
 * Actions, scripts); repeated calls return the same connection instance.
 *
 * @throws If `MONGODB_URI` is missing or the connection attempt fails.
 */
export async function connectToDatabase(): Promise<Mongoose> {
  // Fast path: a live connection is already cached.
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI environment variable. Add it to your .env.local file.",
    );
  }

  // Reuse the pending promise (if any) so parallel requests never open a second connection.
  cached.promise ??= mongoose.connect(uri, {
    ...connectionOptions,
    // Optional override; when unset, Mongoose uses the database name from the URI.
    ...(process.env.MONGODB_DB_NAME
      ? { dbName: process.env.MONGODB_DB_NAME }
      : {}),
  });

  try {
    // Awaiting an already-settled promise is cheap, so every caller can await safely.
    cached.conn = await cached.promise;
  } catch (error) {
    // Do not cache a failed attempt: clearing the promise lets the next call retry.
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectToDatabase;
