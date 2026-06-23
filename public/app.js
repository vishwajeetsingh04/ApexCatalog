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

// Initialize page
window.addEventListener('DOMContentLoaded', async () => {
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
          <span class="card-id">ID: ${escapeHTML(p.id)}</span>
          <span class="card-time">${timeStr}</span>
        </div>
        <div class="card-price">$${Number(p.price).toFixed(2)}</div>
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
