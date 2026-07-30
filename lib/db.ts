import mongoose from 'mongoose';
import dns from 'dns';

// Force DNS resolution to prefer IPv4 first.
// This resolves the MongoDB connection timeout/handshake errors (SSL Alert 80)
// on dual-stack networks (e.g. Jio) where IPv6 whitelisting is not supported by Atlas.
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (error) {
  console.warn('Failed to set default DNS result order to ipv4first:', error);
}

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable in .env.local or Vercel Environment Variables');
  }

  if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      console.log('Successfully connected to MongoDB.');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
