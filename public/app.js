let cursorStack = ['']; // index 0 is first page (no cursor string)
let currentPage = 1;
let currentCategory = '';
let currentLimit = 20;
let hasNextPage = false;
let nextCursorVal = null;

// DOM Elements
const totalProductsEl = document.getElementById('stat-total-products');
const queryTimeEl = document.getElementById('stat-query-time');
const filterCategoryEl = document.getElementById('filter-category');
const filterLimitEl = document.getElementById('filter-limit');
const newCategoryEl = document.getElementById('new-category');
const productsContainer = document.getElementById('products-container');
const pageDisplayEl = document.getElementById('pagination-page-display');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const addProductForm = document.getElementById('add-product-form');
const addProductSuccess = document.getElementById('add-product-success');
const btnSubmitProduct = document.getElementById('btn-submit-product');

// DummyJSON API Mappings
const categoryMap = {
  'Electronics': ['laptops', 'mobile-accessories', 'smartphones'],
  'Clothing': ['mens-shirts', 'mens-shoes', 'womens-dresses', 'womens-shoes', 'womens-bags'],
  'Home & Kitchen': ['furniture', 'home-decoration', 'kitchen-accessories'],
  'Books': ['books'],
  'Sports & Outdoors': ['sports-accessories'],
  'Beauty & Personal Care': ['beauty', 'fragrances', 'skincare'],
  'Automotive': ['automotive', 'motorcycle'],
  'Toys & Games': ['toys']
};

const PRODUCT_NAMES_FALLBACK = {
  'Electronics': ['Wireless Headphones', 'Smart Watch', 'Bluetooth Speaker', '4K Monitor', 'Mechanical Keyboard', 'Gaming Mouse', 'USB-C Hub', 'Smartphone Stand'],
  'Clothing': ['Classic T-Shirt', 'Denim Jacket', 'Running Shoes', 'Wool Socks', 'Leather Belt', 'Slim Fit Jeans', 'Summer Dress', 'Windbreaker'],
  'Home & Kitchen': ['Coffee Maker', 'Air Fryer', 'Chef Knife Set', 'Stainless Steel Pan', 'Food Storage Containers', 'Blender', 'Toaster Oven', 'Electric Kettle'],
  'Books': ['Sci-Fi Novel', 'History Biography', 'Cooking Recipes', 'Self-Help Guide', 'Mystery Thriller', 'Business Strategy', 'Children Storybook', 'Poetry Collection'],
  'Sports & Outdoors': ['Water Bottle', 'Yoga Mat', 'Resistance Bands', 'Sleeping Bag', 'Camping Tent', 'Hiking Backpack', 'Dumbbell Set', 'Bicycle Pump'],
  'Beauty & Personal Care': ['Face Moisturizer', 'Shampoo', 'Conditioner', 'Sunscreens', 'Lip Balm', 'Scented Candle', 'Electric Toothbrush', 'Hair Dryer'],
  'Automotive': ['Car Phone Mount', 'Microfiber Towels', 'Windshield Wipers', 'Car Vacuum Cleaner', 'Seat Organizer', 'Tire Pressure Gauge', 'Dashboard Camera', 'Jump Starter'],
  'Toys & Games': ['Board Game', 'Jigsaw Puzzle', 'Building Blocks', 'Action Figure', 'Card Game', 'Remote Control Car', 'Plush Toy', 'Drawing Board']
};

let apiProductsCache = [];

async function initApiCache() {
  try {
    const res = await fetch('https://dummyjson.com/products?limit=100');
    const data = await res.json();
    if (data && data.products) {
      apiProductsCache = data.products;
    }
  } catch (err) {
    console.warn('Failed to load DummyJSON products, using local fallback:', err);
  }
}

// Initialize page
window.addEventListener('DOMContentLoaded', async () => {
  await initApiCache();
  await loadStats();
  await loadProducts();
});

/**
 * Fetch DB metrics and populate filtering options
 */
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const json = await res.json();
    if (json.success) {
      // Format product count nicely (e.g. 200,000)
      totalProductsEl.textContent = Number(json.totalCount).toLocaleString();
      
      const categories = json.categories.sort();
      
      // Preserve "All Categories" option and empty selections
      filterCategoryEl.innerHTML = '<option value="">All Categories</option>';
      newCategoryEl.innerHTML = '';
      
      categories.forEach(cat => {
        // Dropdown selection for query filter
        const optFilter = document.createElement('option');
        optFilter.value = cat;
        optFilter.textContent = cat;
        filterCategoryEl.appendChild(optFilter);

        // Dropdown selection for creating a product
        const optCreate = document.createElement('option');
        optCreate.value = cat;
        optCreate.textContent = cat;
        newCategoryEl.appendChild(optCreate);
      });
      
      // Default creation select value
      if (categories.length > 0) {
        newCategoryEl.value = categories[0];
      }
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

/**
 * Fetch and render paginated product lists using the cursor matching current page
 */
async function loadProducts() {
  showLoading();
  
  const cursor = cursorStack[currentPage - 1] || '';
  const url = `/api/products?limit=${currentLimit}&category=${currentCategory}&cursor=${encodeURIComponent(cursor)}`;
  
  try {
    const res = await fetch(url);
    const json = await res.json();
    
    if (json.success) {
      queryTimeEl.textContent = `${json.meta.queryDurationMs} ms`;
      hasNextPage = json.meta.hasNextPage;
      nextCursorVal = json.meta.nextCursor;
      
      renderProducts(json.data);
      updatePaginationControls();
    } else {
      showError(json.error || 'Failed to fetch products');
    }
  } catch (err) {
    console.error('Error fetching products:', err);
    showError('Network error connecting to API');
  }
}

/**
 * Render items as structured grid cards
 */
function renderProducts(products) {
  productsContainer.innerHTML = '';
  
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="empty-state">
        <p>No products found matching the criteria.</p>
      </div>
    `;
    return;
  }
  
  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Format timestamp
    const createdDate = new Date(p.created_at);
    const timeStr = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
                    ' ' + createdDate.toLocaleDateString();

    card.innerHTML = `
      <div>
        <div class="card-category">${escapeHTML(p.category)}</div>
        <h4 class="card-title">${escapeHTML(p.name)}</h4>
      </div>
      <div class="card-footer">
        <div class="card-meta">
          <div class="card-price">$${Number(p.price).toFixed(2)}</div>
          <span class="card-time">${timeStr}</span>
        </div>
        <button class="btn-add-to-cart" data-id="${p.id}" data-name="${escapeHTML(p.name)}" data-price="${p.price}">
          Add to Cart
        </button>
      </div>
    `;
    
    productsContainer.appendChild(card);
  });
}

/**
 * Updates UI pagination buttons and states
 */
function updatePaginationControls() {
  pageDisplayEl.textContent = `Page ${currentPage}`;
  btnPrev.disabled = currentPage === 1;
  btnNext.disabled = !hasNextPage;
}

// Next Page Handler: Save returning cursor and move forward
btnNext.addEventListener('click', () => {
  if (hasNextPage && nextCursorVal) {
    cursorStack[currentPage] = nextCursorVal;
    currentPage++;
    loadProducts();
  }
});

// Previous Page Handler: Pop current index from tracking
btnPrev.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    loadProducts();
  }
});

// Category Filter Listener: Reset paging state and execute fetch
filterCategoryEl.addEventListener('change', (e) => {
  currentCategory = e.target.value;
  resetPagination();
  loadProducts();
});

// Limit Filter Listener: Reset paging state and execute fetch
filterLimitEl.addEventListener('change', (e) => {
  currentLimit = parseInt(e.target.value) || 20;
  resetPagination();
  loadProducts();
});

function resetPagination() {
  cursorStack = [''];
  currentPage = 1;
}

function showLoading() {
  productsContainer.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading products...</p>
    </div>
  `;
}

function showError(msg) {
  productsContainer.innerHTML = `
    <div class="empty-state">
      <p style="color: #ef4444;">Error: ${escapeHTML(msg)}</p>
    </div>
  `;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Handle new product submission
 */
addProductForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('new-name').value;
  const category = newCategoryEl.value;
  const price = document.getElementById('new-price').value;
  
  btnSubmitProduct.disabled = true;
  btnSubmitProduct.textContent = 'Adding...';
  
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, category, price })
    });
    
    const json = await res.json();
    
    if (json.success) {
      // Reset input form
      document.getElementById('new-name').value = '';
      document.getElementById('new-price').value = '';
      
      // Update statistics count
      await loadStats();
      
      // Show Success alert
      addProductSuccess.classList.remove('hidden');
      setTimeout(() => {
        addProductSuccess.classList.add('hidden');
      }, 3000);
      
      // If browsing Page 1, automatically reload to display the item at the top.
      // If browsing subsequent pages, do not reload - showing pagination cursor stability!
      if (currentPage === 1) {
        await loadProducts();
      }
    } else {
      alert(json.error || 'Failed to add product');
    }
  } catch (err) {
    console.error('Error adding product:', err);
    alert('Failed to connect to server');
  } finally {
    btnSubmitProduct.disabled = false;
    btnSubmitProduct.textContent = 'Add Product';
  }
});

// ==========================================
// SHOPPING CART LOGIC
// ==========================================

let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Initialize Cart UI on load
window.addEventListener('DOMContentLoaded', () => {
  renderCart();
});

// Event Delegation for "Add to Cart" buttons in products container
productsContainer.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-add-to-cart');
  if (btn) {
    const id = btn.getAttribute('data-id');
    const name = btn.getAttribute('data-name');
    const price = parseFloat(btn.getAttribute('data-price'));
    addToCart(id, name, price);
  }
});

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(id, name, price) {
  const existingItem = cart.find(item => item.id === id);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ id, name, price, quantity: 1 });
  }
  saveCart();
  renderCart();
  showToast(`Added "${name}" to cart!`);
}

function removeFromCart(id) {
  const item = cart.find(item => item.id === id);
  const name = item ? item.name : 'Item';
  cart = cart.filter(item => item.id !== id);
  saveCart();
  renderCart();
  showToast(`Removed "${name}" from cart.`, 'info');
}

function updateQuantity(id, change) {
  const item = cart.find(item => item.id === id);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(id);
    } else {
      saveCart();
      renderCart();
    }
  }
}

function clearCart() {
  if (cart.length === 0) return;
  cart = [];
  saveCart();
  renderCart();
  showToast('Cart cleared.', 'info');
}

function checkout() {
  if (cart.length === 0) return;
  
  // Create checkout visual confirmation
  showToast('Processing checkout...', 'success');
  
  setTimeout(() => {
    alert(`Checkout successful! Thank you for buying ${cart.reduce((sum, item) => sum + item.quantity, 0)} items.`);
    cart = [];
    saveCart();
    renderCart();
  }, 1000);
}

function renderCart() {
  const cartItemsEl = document.getElementById('cart-items');
  const cartCountEl = document.getElementById('cart-count');
  const cartSummaryEl = document.getElementById('cart-summary');
  const cartTotalPriceEl = document.getElementById('cart-total-price');
  
  if (!cartItemsEl || !cartCountEl || !cartSummaryEl || !cartTotalPriceEl) return;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  cartCountEl.textContent = totalItems;
  
  if (cart.length === 0) {
    cartItemsEl.innerHTML = `<p class="empty-cart-msg">Your cart is empty.</p>`;
    cartSummaryEl.classList.add('hidden');
    return;
  }
  
  cartSummaryEl.classList.remove('hidden');
  cartTotalPriceEl.textContent = `$${totalPrice.toFixed(2)}`;
  
  cartItemsEl.innerHTML = '';
  cart.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name" title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</div>
        <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)} (${item.quantity} x $${item.price.toFixed(2)})</div>
      </div>
      <div class="cart-item-controls">
        <button class="cart-qty-btn" onclick="updateQuantity('${item.id}', -1)">−</button>
        <span class="cart-qty">${item.quantity}</span>
        <button class="cart-qty-btn" onclick="updateQuantity('${item.id}', 1)">＋</button>
        <button class="cart-remove-btn" onclick="removeFromCart('${item.id}')">✕</button>
      </div>
    `;
    cartItemsEl.appendChild(itemEl);
  });
}

// Toast Popup system
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '🛒';
  if (type === 'info') icon = 'ℹ️';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 3s
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3000);
}

// Bind Cart Action Buttons
document.getElementById('btn-clear-cart').addEventListener('click', clearCart);
document.getElementById('btn-checkout').addEventListener('click', checkout);

// Expose functions globally for onclick attributes
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;

// Simulate real-time data drift (50 products added in background)
// Helper to generate N unique product names for a category using DummyJSON data + fallback
function generateUniqueProductNames(category, count) {
  const targetApiCats = categoryMap[category] || [];
  let availableItems = apiProductsCache.filter(p => targetApiCats.includes(p.category));
  const fallbackList = PRODUCT_NAMES_FALLBACK[category] || ['Generic Item'];
  
  const baseNames = [];
  availableItems.forEach(item => baseNames.push(item.title));
  
  // Mix in fallbacks if cache is dry or too small
  while (baseNames.length < count * 2) {
    baseNames.push(...fallbackList);
  }
  
  // Shuffle baseNames
  baseNames.sort(() => Math.random() - 0.5);
  
  const uniqueNames = new Set();
  let attempt = 0;
  const modifiers = ['Pro', 'Ultra', 'Max', 'Plus', 'Lite', 'Elite', 'Prime', 'X', 'Edition', 'Special', 'Advanced', 'Classic', 'Sleek', 'Deluxe', 'Premium'];
  
  while (uniqueNames.size < count && attempt < 1000) {
    const base = baseNames[attempt % baseNames.length];
    const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    
    let name = '';
    const choice = attempt % 3;
    if (choice === 0) {
      name = `${base} ${mod}`;
    } else if (choice === 1) {
      name = `${base} (${mod} #${num})`;
    } else {
      name = `${mod} ${base}`;
    }
    
    uniqueNames.add(name);
    attempt++;
  }
  
  return Array.from(uniqueNames);
}

// Simulate real-time data drift (50 products added in background)
async function simulateBackgroundAdditions() {
  const btn = document.getElementById('btn-simulate-additions');
  const feedback = document.getElementById('drift-simulation-feedback');
  if (!btn || !feedback) return;

  btn.disabled = true;
  btn.textContent = 'Simulating...';
  feedback.innerHTML = '';

  // Determine target category
  const targetCategory = currentCategory || 'All Categories';
  showToast(`Adding 50 unique products to "${targetCategory}" in background...`, 'info');

  const categories = Object.keys(categoryMap);
  const promises = [];

  // Generate 50 unique names
  let names = [];
  if (currentCategory) {
    names = generateUniqueProductNames(currentCategory, 50);
  } else {
    // Generate names across random categories
    for (let i = 0; i < 50; i++) {
      const randomCat = categories[Math.floor(Math.random() * categories.length)];
      const singleName = generateUniqueProductNames(randomCat, 1)[0];
      names.push({ name: singleName, category: randomCat });
    }
  }

  for (let i = 0; i < 50; i++) {
    const name = currentCategory ? names[i] : names[i].name;
    const category = currentCategory ? currentCategory : names[i].category;
    
    // Attempt to pull a price from API products or random double
    let price = parseFloat((Math.random() * 200 + 5.99).toFixed(2));
    const matchedApi = apiProductsCache.find(p => p.title === name.split(' ')[0]);
    if (matchedApi) {
      price = matchedApi.price;
    }

    promises.push(
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, price })
      }).then(r => r.json())
    );
  }

  try {
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;

    showToast(`Added ${successCount} products to "${targetCategory}"!`, 'success');
    await loadStats(); // Update total count badge in UI

    feedback.innerHTML = `
      <div class="alert alert-success" style="margin-top: 0.5rem; line-height: 1.4; border-radius: 8px; font-size: 0.8rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: #a7f3d0; padding: 0.75rem;">
        <strong>🎉 Drift Test Complete!</strong><br>
        Inserted <strong>50 UNIQUE products</strong> into <strong>"${targetCategory}"</strong> at the top of the database.<br>
        Notice that your current page contents did NOT shift or jump. Click <strong>Next Page</strong> and <strong>Previous Page</strong> to verify there are <strong>zero duplicates or missed products</strong>!
      </div>
    `;
  } catch (err) {
    console.error('Simulation failed:', err);
    showToast('Failed to simulate additions', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simulate 50 Background Additions';
  }
}

// Autofill Quick Add form using DummyJSON API data
function autofillFromApi() {
  const category = newCategoryEl.value;
  if (!category) return;
  
  // Generate 1 unique product name
  const name = generateUniqueProductNames(category, 1)[0];
  
  // Determine a matching price if we can find one in the API cache, or fallback to randomized
  let price = parseFloat((Math.random() * 150 + 9.99).toFixed(2));
  const targetApiCats = categoryMap[category] || [];
  const matchedApiItems = apiProductsCache.filter(p => targetApiCats.includes(p.category));
  if (matchedApiItems.length > 0) {
    price = matchedApiItems[Math.floor(Math.random() * matchedApiItems.length)].price;
  }
  
  // Fill input fields
  document.getElementById('new-name').value = name;
  document.getElementById('new-price').value = price;
  
  showToast(`Suggested: "${name}" for $${price}`, 'info');
}

// Bind stability demo & autofill buttons
const btnSimulateAdditions = document.getElementById('btn-simulate-additions');
if (btnSimulateAdditions) {
  btnSimulateAdditions.addEventListener('click', simulateBackgroundAdditions);
}

const btnAutofillApi = document.getElementById('btn-autofill-api');
if (btnAutofillApi) {
  btnAutofillApi.addEventListener('click', autofillFromApi);
}
