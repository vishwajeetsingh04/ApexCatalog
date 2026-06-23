const { initDB, closeDB } = require('./db');
const crypto = require('crypto');

const CATEGORIES = ['Electronics', 'Clothing', 'Home & Kitchen', 'Books', 'Sports & Outdoors', 'Beauty & Personal Care', 'Automotive', 'Toys & Games'];

const WORD_BANKS = {
  'Electronics': {
    brands: ['Sony', 'Samsung', 'Apple', 'Dell', 'HP', 'Lenovo', 'Logitech', 'Bose', 'Sennheiser', 'LG', 'Asus', 'Acer', 'Xiaomi', 'OnePlus', 'Anker'],
    adjectives: ['Wireless', 'Bluetooth', 'Noise-Cancelling', 'Smart', 'Gaming', 'Ergonomic', 'Portable', 'HD', '4K', 'Ultra-Slim', 'Mechanical', 'Rechargeable', 'Waterproof', 'High-Speed', 'Studio'],
    nouns: ['Headphones', 'Watch', 'Speaker', 'Monitor', 'Keyboard', 'Mouse', 'Earbuds', 'Charger', 'Tablet', 'Laptop', 'Webcam', 'Router', 'Power Bank', 'Adapter', 'Microphone'],
    models: ['X100', 'V2', 'Pro', 'Max', 'G5', 'Series 7', 'Ultra', 'Elite', 'Plus', 'Air', 'Standard', 'Lite', 'Nova', 'Alpha', 'Prime']
  },
  'Clothing': {
    brands: ['Nike', 'Adidas', 'Puma', 'Under Armour', 'Levis', 'Zara', 'H&M', 'Tommy Hilfiger', 'Calvin Klein', 'Ralph Lauren', 'Uniqlo', 'Champion', 'Reebok', 'Gap', 'Patagonia'],
    adjectives: ['Classic', 'Sporty', 'Slim-Fit', 'Oversized', 'Casual', 'Formal', 'Breathable', 'Thermal', 'Waterproof', 'Vintage', 'Modern', 'Graphic', 'Seamless', 'Stretch', 'Cozy'],
    nouns: ['T-Shirt', 'Jacket', 'Hoodie', 'Pants', 'Jeans', 'Socks', 'Belt', 'Shoes', 'Sneakers', 'Sweater', 'Shorts', 'Coat', 'Scarf', 'Gloves', 'Hat'],
    models: ['Premium', 'Essential', 'Performance', 'Comfort', 'Active', 'All-Weather', 'Urban', 'Daily', 'Retro', 'Signature', 'Vanguard', 'Legacy', 'Explorer', 'Elite', 'Flex']
  },
  'Home & Kitchen': {
    brands: ['Philips', 'Breville', 'Instant Pot', 'Cuisinart', 'Keurig', 'Ninja', 'Dyson', 'KitchenAid', 'T-fal', 'Le Creuset', 'Pyrex', 'Oxo', 'Shark', 'iRobot', 'Hamilton Beach'],
    adjectives: ['Electric', 'Automatic', 'Stainless Steel', 'Non-Stick', 'Compact', 'Multi-Functional', 'Cordless', 'Heavy-Duty', 'Ergonomic', 'Smart', 'Quiet', 'Eco-Friendly', 'Precision', 'Digital', 'Rapid'],
    nouns: ['Coffee Maker', 'Air Fryer', 'Blender', 'Toaster', 'Kettle', 'Food Processor', 'Juicer', 'Microwave', 'Knife Set', 'Pan', 'Pot', 'Vacuum Cleaner', 'Air Purifier', 'Humidifier', 'Scale'],
    models: ['Pro', 'Express', 'Classic', 'Elite', 'Touch', 'Smart', 'Plus', 'Max', 'Duo', 'Deluxe', 'Compact', 'Select', 'Supreme', 'Chef Edition', 'Precision']
  },
  'Books': {
    brands: ['Penguin', 'HarperCollins', 'Simon & Schuster', 'Macmillan', 'Hachette', 'Random House', 'Scholastic', 'Oxford', 'Cambridge', 'Chronicle', 'Vintage', 'Signet', 'Bantam', 'Pocket', 'Anchor'],
    adjectives: ['Lost', 'Secret', 'Silent', 'Forgotten', 'Dark', 'Golden', 'Eternal', 'Hidden', 'Last', 'First', 'Future', 'Ancient', 'Strange', 'Beautiful', 'Broken'],
    nouns: ['Chronicles', 'Empire', 'Journey', 'Legacy', 'Shadow', 'Kingdom', 'Prophecy', 'Voyage', 'Whisper', 'Song', 'Path', 'Echo', 'Destiny', 'Alliance', 'Dreamer'],
    models: ['Vol 1', 'Vol 2', 'Trilogy', 'Special Edition', 'Illustrated', 'Annotated', 'Revised', 'Collector\'s', 'Unabridged', 'Standard', 'Hardcover', 'Paperback', 'Audiobook', 'Draft', 'Manuscript']
  },
  'Sports & Outdoors': {
    brands: ['Columbia', 'The North Face', 'Garmin', 'Coleman', 'CamelBak', 'Spalding', 'Wilson', 'Everlast', 'Yeti', 'Rawlings', 'Callaway', 'Speedo', 'Oakley', 'Shimano', 'Giro'],
    adjectives: ['Outdoor', 'Camping', 'Hiking', 'Athletic', 'Heavy-Duty', 'Lightweight', 'All-Terrain', 'Waterproof', 'Thermal', 'Shockproof', 'Compact', 'Adjustable', 'Protective', 'Aerodynamic', 'Ventilated'],
    nouns: ['Backpack', 'Tent', 'Sleeping Bag', 'Water Bottle', 'GPS Watch', 'Basketball', 'Football', 'Tennis Racket', 'Helmet', 'Bicycle', 'Dumbbell', 'Yoga Mat', 'Resistance Band', 'Goggles', 'Compass'],
    models: ['Explorer', 'Summit', 'Ranger', 'Pro', 'Trail', 'Navigator', 'Active', 'Combat', 'Outpost', 'Vanguard', 'Alpha', 'Apex', 'Trek', 'Cruiser', 'Patrol']
  },
  'Beauty & Personal Care': {
    brands: ['L\'Oreal', 'Maybelline', 'Estee Lauder', 'Clinique', 'Nivea', 'Dove', 'Olay', 'Neutrogena', 'CeraVe', 'Garnier', 'MAC', 'Sephora', 'Colgate', 'Gillette', 'Oral-B'],
    adjectives: ['Hydrating', 'Moisturizing', 'Anti-Aging', 'Organic', 'Natural', 'Gentle', 'Revitalizing', 'Nourishing', 'Soothing', 'Brightening', 'Exfoliating', 'Cruelty-Free', 'Vegan', 'Refreshing', 'Pure'],
    nouns: ['Cream', 'Serum', 'Lotion', 'Shampoo', 'Conditioner', 'Face Wash', 'Sunscreen', 'Lip Balm', 'Cleanser', 'Mask', 'Scrub', 'Toothbrush', 'Toothpaste', 'Razor', 'Deodorant'],
    models: ['Daily Care', 'Sensitive', 'Ultra', 'Pro', 'Classic', 'Essential', 'Advanced', 'Active', 'Therapy', 'Restore', 'Defense', 'Glow', 'Renew', 'Smooth', 'Refresh']
  },
  'Automotive': {
    brands: ['Bosch', 'Michelin', 'Castrol', 'Meguiar\'s', 'Garmin', 'Pioneer', 'Kenwood', 'Black & Decker', 'Anker', 'NOCO', 'VIOS', 'Philips', 'Turtle Wax', 'Rain-X', 'Mobil 1'],
    adjectives: ['Synthetic', 'High-Performance', 'Heavy-Duty', 'Portable', 'Digital', 'Automatic', 'Universal', 'Waterproof', 'Scratch-Resistant', 'Ultra-Bright', 'Quick-Release', 'Multi-Purpose', 'Wireless', 'Anti-Slip', 'Compact'],
    nouns: ['Motor Oil', 'Car Wax', 'Phone Mount', 'Vacuum Cleaner', 'Jump Starter', 'Wiper Blade', 'Tire Gauge', 'Dash Cam', 'Seat Cover', 'Floor Mat', 'Charger', 'Tire Inflator', 'Tool Kit', 'LED Bulbs', 'Air Freshener'],
    models: ['Pro', 'Max', 'Ultra', 'Premium', 'Standard', 'Plus', 'Series 3', 'Elite', 'Signature', 'Vanguard', 'Force', 'Classic', 'Sport', 'All-Season', 'Heavy']
  },
  'Toys & Games': {
    brands: ['Lego', 'Hasbro', 'Mattel', 'Nerf', 'Fisher-Price', 'Barbie', 'Hot Wheels', 'Monopoly', 'Nintendo', 'Play-Doh', 'Ravensburger', 'Melissa & Doug', 'VTech', 'Funko', 'Crayola'],
    adjectives: ['Interactive', 'Educational', 'Creative', 'Mechanical', 'Electronic', 'Wooden', 'Plush', 'Colorful', 'Magnetic', 'Tactile', 'Puzzle', 'Strategy', 'Cooperative', 'Classic', 'Miniature'],
    nouns: ['Building Set', 'Board Game', 'Action Figure', 'Puzzle', 'Card Game', 'Blaster', 'Doll', 'Toy Car', 'Drawing Board', 'Microphone', 'Robot', 'Modeling Clay', 'Train Set', 'Laptop', 'Blocks'],
    models: ['Edition 1', 'Series 2', 'Collector\'s', 'Deluxe', 'Classic', 'Junior', 'Pro', 'Smart', 'Master', 'Explorer', 'Starter Kit', 'Family Pack', 'Special', 'Ultimate', 'Lite']
  }
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

  // Track product name counts for deterministic uniqueness
  const countsPerCategory = {};
  CATEGORIES.forEach(cat => {
    countsPerCategory[cat] = 0;
  });

  console.log(`Generating and inserting ${TOTAL_PRODUCTS} completely unique products in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < TOTAL_PRODUCTS; i += BATCH_SIZE) {
    const productsBatch = [];
    
    for (let j = 0; j < BATCH_SIZE; j++) {
      const currentIdx = i + j;
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      
      const idx = countsPerCategory[category]++;
      const bank = WORD_BANKS[category];
      
      // Use a coprime multiplier (1337) with 50625 (15^4) to create a perfect bijection.
      // This scrambles the combinations so adjacent products don't share the same brand/noun.
      const p = (idx * 1337) % 50625;
      
      const brand = bank.brands[Math.floor(p / 3375) % 15];
      const adj = bank.adjectives[Math.floor(p / 225) % 15];
      const noun = bank.nouns[Math.floor(p / 15) % 15];
      const model = bank.models[p % 15];
      
      const name = `${brand} ${adj} ${noun} ${model}`;
      
      // Realistic prices from $5.99 to $999.99
      const price = parseFloat((Math.random() * 994 + 5.99).toFixed(2));
      
      // Stagger creation times so newest first pagination has clear order.
      // Every product is created 5 seconds apart from the previous one, stretching back in time.
      const createdAt = new Date(startTime - currentIdx * 5000); 
      const updatedAt = new Date(createdAt.getTime() + Math.floor(Math.random() * 1000 * 60 * 60 * 2)); // updated slightly later (within 2 hours)

      productsBatch.push({
        id: crypto.randomUUID(), // Generates a unique UUID v4
        name,
        category,
        price,
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
  console.log(`\nSUCCESS: Seeded ${seededCount} completely unique products in ${duration} seconds!`);
  
  await closeDB();
}

seed().catch(err => {
  console.error('Seed process failed:', err);
  process.exit(1);
});
