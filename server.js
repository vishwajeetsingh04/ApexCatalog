const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const { connectDB, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serves our frontend UI files

/**
 * Base64 encodes cursor data (created_at timestamp + unique database _id)
 */
function encodeCursor(product) {
  if (!product) return null;
  const cursorData = {
    created_at: product.created_at,
    _id: product._id.toString()
  };
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Decodes a Base64 cursor string into timestamp and _id
 */
function decodeCursor(cursorStr) {
  try {
    const jsonStr = Buffer.from(cursorStr, 'base64').toString('utf8');
    const data = JSON.parse(jsonStr);
    return {
      created_at: new Date(data.created_at),
      _id: data._id
    };
  } catch (e) {
    return null; // Invalid or malformed cursor
  }
}

/**
 * API Endpoint: Paginated browse of products
 * Query Params:
 * - limit: Number of products to return (default 20, max 100)
 * - category: Category filter (optional)
 * - cursor: Keyset pagination cursor (optional)
 */
app.get('/api/products', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('products');

    // 1. Parse limit
    let limit = parseInt(req.query.limit) || 20;
    if (limit < 1) limit = 20;
    if (limit > 100) limit = 100; // Security check: cap maximum limit

    // 2. Parse category filter
    const category = req.query.category;
    const query = {};
    if (category) {
      query.category = category;
    }

    // 3. Parse and apply cursor
    const cursorStr = req.query.cursor;
    if (cursorStr) {
      const decoded = decodeCursor(cursorStr);
      if (decoded) {
        const { created_at, _id } = decoded;
        
        // Cursor query logic:
        // Match items where (created_at < cursor.created_at) OR 
        // (created_at = cursor.created_at AND _id < cursor._id)
        // This acts as a seek operation, jumping immediately to our cursor position.
        query.$or = [
          { created_at: { $lt: created_at } },
          {
            created_at: created_at,
            _id: { $lt: new ObjectId(_id) }
          }
        ];
      }
    }

    const queryStartTime = Date.now();

    // Fetch limit + 1 items to see if there is another page
    const products = await collection.find(query)
      .sort({ created_at: -1, _id: -1 })
      .limit(limit + 1)
      .toArray();

    const queryDurationMs = Date.now() - queryStartTime;

    const hasNextPage = products.length > limit;
    const items = hasNextPage ? products.slice(0, limit) : products;
    
    // Create cursor using the last item in the page
    const nextCursor = hasNextPage && items.length > 0 
      ? encodeCursor(items[items.length - 1]) 
      : null;

    res.json({
      success: true,
      data: items,
      meta: {
        limit,
        count: items.length,
        hasNextPage,
        nextCursor,
        queryDurationMs
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * API Endpoint: Retrieve real-time statistics (total products and categories list)
 */
app.get('/api/stats', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('products');
    
    // O(1) performance estimate of collection count
    const totalCount = await collection.estimatedDocumentCount();
    
    // Fetch unique categories for dropdown filter
    const categories = await collection.distinct('category');

    res.json({
      success: true,
      totalCount,
      categories
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * API Endpoint: Add a new product (demonstrates real-time pagination stability)
 */
app.post('/api/products', async (req, res) => {
  try {
    const { name, category, price } = req.body;
    if (!name || !category || !price) {
      return res.status(400).json({ success: false, error: 'Missing required fields (name, category, price)' });
    }

    const db = await connectDB();
    const collection = db.collection('products');

    const newProduct = {
      id: crypto.randomUUID(),
      name,
      category,
      price: parseFloat(price),
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await collection.insertOne(newProduct);
    
    res.status(201).json({
      success: true,
      message: 'Product added successfully!',
      product: {
        _id: result.insertedId,
        ...newProduct
      }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Initialize DB indexes, then boot up Express server
console.log('Initializing database connection...');
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`Backend Server is running on http://localhost:${PORT}`);
      console.log(`==================================================`);
    });
  })
  .catch(err => {
    console.error('CRITICAL: Database initialization failed. Exiting server...', err);
    process.exit(1);
  });
