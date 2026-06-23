const { initDB, closeDB } = require('./db');
const crypto = require('crypto');

const CATEGORIES = ['Electronics', 'Clothing', 'Home & Kitchen', 'Books', 'Sports & Outdoors', 'Beauty & Personal Care', 'Automotive', 'Toys & Games'];
const PRODUCT_NAMES = {
  'Electronics': ['Wireless Headphones', 'Smart Watch', 'Bluetooth Speaker', '4K Monitor', 'Mechanical Keyboard', 'Gaming Mouse', 'USB-C Hub', 'Smartphone Stand'],
  'Clothing': ['Classic T-Shirt', 'Denim Jacket', 'Running Shoes', 'Wool Socks', 'Leather Belt', 'Slim Fit Jeans', 'Summer Dress', 'Windbreaker'],
  'Home & Kitchen': ['Coffee Maker', 'Air Fryer', 'Chef Knife Set', 'Stainless Steel Pan', 'Food Storage Containers', 'Blender', 'Toaster Oven', 'Electric Kettle'],
  'Books': ['Sci-Fi Novel', 'History Biography', 'Cooking Recipes', 'Self-Help Guide', 'Mystery Thriller', 'Business Strategy', 'Children Storybook', 'Poetry Collection'],
  'Sports & Outdoors': ['Water Bottle', 'Yoga Mat', 'Resistance Bands', 'Sleeping Bag', 'Camping Tent', 'Hiking Backpack', 'Dumbbell Set', 'Bicycle Pump'],
  'Beauty & Personal Care': ['Face Moisturizer', 'Shampoo', 'Conditioner', 'Sunscreens', 'Lip Balm', 'Scented Candle', 'Electric Toothbrush', 'Hair Dryer'],
  'Automotive': ['Car Phone Mount', 'Microfiber Towels', 'Windshield Wipers', 'Car Vacuum Cleaner', 'Seat Organizer', 'Tire Pressure Gauge', 'Dashboard Camera', 'Jump Starter'],
  'Toys & Games': ['Board Game', 'Jigsaw Puzzle', 'Building Blocks', 'Action Figure', 'Card Game', 'Remote Control Car', 'Plush Toy', 'Drawing Board']
};

async function seed() {
  console.log('Starting seed process...');
  const startTime = Date.now();
  
  // Initialize db and create indexes
  const db = await initDB();
  const collection = db.collection('products');

  // Clear existing products
  console.log('Clearing existing products in database...');
  await collection.deleteMany({});
  
  const TOTAL_PRODUCTS = 200000;
  const BATCH_SIZE = 10000;
  let seededCount = 0;

  console.log(`Generating and inserting ${TOTAL_PRODUCTS} products in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < TOTAL_PRODUCTS; i += BATCH_SIZE) {
    const productsBatch = [];
    
    for (let j = 0; j < BATCH_SIZE; j++) {
      const currentIdx = i + j;
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const namesList = PRODUCT_NAMES[category];
      const baseName = namesList[Math.floor(Math.random() * namesList.length)];
      
      // Realistic prices from $5.99 to $999.99
      const price = parseFloat((Math.random() * 994 + 5.99).toFixed(2));
      
      // Stagger creation times so newest first pagination has clear order.
      // Every product is created 5 seconds apart from the previous one, stretching back in time.
      const createdAt = new Date(startTime - currentIdx * 5000); 
      const updatedAt = new Date(createdAt.getTime() + Math.floor(Math.random() * 1000 * 60 * 60 * 2)); // updated slightly later (within 2 hours)

      productsBatch.push({
        id: crypto.randomUUID(), // Generates a unique UUID v4
        name: `${baseName} (Gen #${currentIdx + 1})`,
        category: category,
        price: price,
        created_at: createdAt,
        updated_at: updatedAt
      });
    }

    // Insert batch in one call - extremely fast!
    await collection.insertMany(productsBatch);
    seededCount += productsBatch.length;
    console.log(`Inserted ${seededCount}/${TOTAL_PRODUCTS} products...`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nSUCCESS: Seeded ${seededCount} products in ${duration} seconds!`);
  
  await closeDB();
}

seed().catch(err => {
  console.error('Seed process failed:', err);
  process.exit(1);
});
