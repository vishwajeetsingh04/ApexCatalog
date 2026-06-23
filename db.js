const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('ERROR: MONGO_URI is not set in the .env file.');
  process.exit(1);
}

let client;
let db = null;

/**
 * Connect to MongoDB and return the DB instance
 */
async function connectDB() {
  if (db) return db;
  
  try {
    client = new MongoClient(uri);
    await client.connect();
    // MongoDB client automatically parses the default database name from connection string
    db = client.db(); 
    console.log(`Successfully connected to MongoDB database: "${db.databaseName}"`);
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Initialize collection indexes for high-performance cursor pagination
 */
async function initDB() {
  const database = await connectDB();
  const collection = database.collection('products');

  console.log('Checking/creating indexes for fast pagination...');
  
  // 1. Index for category-filtered sorting: (category, created_at DESC, _id DESC)
  // This allows filtering by category, then immediately ordering by newest created_at, with _id as tie-breaker
  await collection.createIndex(
    { category: 1, created_at: -1, _id: -1 },
    { name: 'idx_category_created_id' }
  );

  // 2. Index for global sorting (no category filter): (created_at DESC, _id DESC)
  // This allows fast newest-first sorting for all products
  await collection.createIndex(
    { created_at: -1, _id: -1 },
    { name: 'idx_created_id' }
  );

  console.log('Database indexes verified successfully.');
  return database;
}

module.exports = {
  connectDB,
  initDB,
  closeDB: async () => {
    if (client) {
      await client.close();
      db = null;
      client = null;
      console.log('MongoDB connection closed.');
    }
  }
};
