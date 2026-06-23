# Backend for Paginated Product Catalog (200k Products)

A Node.js backend with SQLite to browse, filter by category, and paginate through ~200,000 products (newest first). It ensures high performance and consistent paginated views even when new products are added or updated in real-time.

## User Review Required

> [!IMPORTANT]
> **Database Choice**: We will use SQLite with the `sqlite3` driver. SQLite is perfect for a beginner because it requires zero server setup (it runs off a single local file) and installs easily on Windows.
> We will wrap it in a lightweight promise utility so you can use modern `async/await` syntax.

> [!NOTE]
> **Pagination Approach**: We will use **Cursor-Based Pagination** (also known as Keyset Pagination) instead of offset-based pagination (`LIMIT/OFFSET`). 
> - **Why standard OFFSET pagination is bad here**:
>   1. **Performance**: `OFFSET 100000` requires the database to scan and discard 100,000 rows, making it slow as you page deeper.
>   2. **Drifting Data / Duplicates**: If 50 new products are added at the top while browsing, offset-based pagination shifts all items down. When the user requests the next page, they will see duplicate products.
> - **How Cursor-Based Pagination fixes this**:
>   We use a cursor consisting of the last seen product's `(created_at, id)`. The next query fetches products created before that timestamp. This is fully indexed, runs in `O(log N)` time, and is completely immune to duplicates or missing items when new products are added.

## Proposed Changes

### Project Setup

#### [NEW] [package.json](file:///c:/vishu%20study/task%20for%20compnay/package.json)
Initialize npm package and define dependencies:
- `express` for the REST API.
- `sqlite3` for SQLite database operations.
- `cors` to allow cross-origin requests.

#### [NEW] [database.js](file:///c:/vishu%20study/task%20for%20compnay/database.js)
Database connection helper and initialization logic.
- Creates `products` table.
- Sets up performance indexes:
  - `idx_products_created_id` on `(created_at DESC, id DESC)` for fast global sorting.
  - `idx_products_category_created_id` on `(category, created_at DESC, id DESC)` for fast category-filtered sorting.

#### [NEW] [seed.js](file:///c:/vishu%20study/task%20for%20compnay/seed.js)
The product generator script.
- Generates 200,000 products.
- Uses SQLite transactions (`BEGIN` / `COMMIT`) and prepared statements to insert 200,000 rows in a few seconds.
- Avoids the slow loop-by-loop disk commits.

#### [NEW] [server.js](file:///c:/vishu%20study/task%20for%20compnay/server.js)
Express server with a paginated endpoint `/api/products`.
- Accepts query parameters: `category`, `limit` (default 20, max 100), and `cursor`.
- Decodes/encodes cursors using base64.
- Returns list of products and `nextCursor`.

#### [NEW] [README.md](file:///c:/vishu%20study/task%20for%20compnay/README.md)
Step-by-step instructions for a beginner on how to install, seed, run, and test the project.

---

## Database Schema

```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  created_at INTEGER NOT NULL, -- Unix timestamp in milliseconds
  updated_at INTEGER NOT NULL  -- Unix timestamp in milliseconds
);

-- Indexes for lightning-fast cursor pagination
CREATE INDEX IF NOT EXISTS idx_products_created_id ON products(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_products_category_created_id ON products(category, created_at DESC, id DESC);
```

---

## Cursor Pagination SQL Logic

To paginate "newest first" (using `created_at DESC, id DESC`), the query pattern is:
```sql
SELECT * FROM products
WHERE (created_at < ? OR (created_at = ? AND id < ?))
ORDER BY created_at DESC, id DESC
LIMIT ?;
```
If a `category` filter is active:
```sql
SELECT * FROM products
WHERE category = ?
  AND (created_at < ? OR (created_at = ? AND id < ?))
ORDER BY created_at DESC, id DESC
LIMIT ?;
```

---

## Verification Plan

### Automated/Manual Execution
1. Run `npm install`.
2. Run `node seed.js` to verify it seeds 200,000 products in under 5 seconds.
3. Start server using `node server.js`.
4. Test endpoint `/api/products?limit=5` to see the first page.
5. Use the returned `nextCursor` value as the `cursor` parameter for the next request (`/api/products?limit=5&cursor=<cursor_value>`) to verify paginated results.
6. Verify that creating a new product with current timestamp does not affect the cursor-pagination order or cause duplicates when moving through subsequent pages.
