import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';

const dbPath = path.resolve(process.cwd(), '.tmp/mongo-data');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

console.log('Starting local MongoDB server on port 27017...');
try {
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'careerpilot',
      dbPath,
      storageEngine: 'wiredTiger',
    },
  });

  console.log(`✅ MongoDB running at: mongodb://127.0.0.1:27017/careerpilot`);
  console.log(`Database storage path: ${dbPath}`);

  const shutdown = async () => {
    console.log('\nStopping MongoDB server...');
    await mongod.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (err) {
  console.error('Failed to start MongoMemoryServer:', err);
  process.exit(1);
}
