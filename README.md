# 🚀 High-Performance Paginated Catalog Dashboard (200k Products)

Welcome to **ApexCatalog**! This is a complete, beginner-friendly Node.js and MongoDB project that demonstrates how to build and browse a massive product feed of **200,000 products**. 

It uses **Cursor-Based Pagination** (also known as Keyset Pagination) to ensure query speeds remain lightning-fast (under 5 milliseconds) even on deep pages, and to prevent duplicates or skipped items when new products are added in real-time.

---

## 🛠️ Tech Stack & Features

- **Backend**: Node.js, Express, MongoDB (official native driver).
- **Frontend**: HTML5, Vanilla CSS3 (with custom variables, glowing dark mode, glassmorphism, responsive grid), and Vanilla JavaScript.
- **Fast Seeding**: Seeding of 200,000 unique products in **under 5 seconds** using MongoDB `insertMany()` batches.
- **Cursor Pagination**: Query execution time scales at $O(\log N)$ instead of the traditional $O(N)$ scanning associated with `skip()` / `offset`.
- **Live Injections**: A "Quick Add" form to inject new products, showing that pagination remains completely stable.

---

## 📋 Prerequisites

Before starting, ensure you have:
1. **Node.js** (v16 or higher) installed on your system.
2. A **MongoDB Connection String**. You can use:
   - A local MongoDB instance (`mongodb://localhost:27017/catalog_db`)
   - **(Recommended)** A free cloud cluster on [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database). It takes 2 minutes to register, requires no credit card, and gives you a hosted MongoDB database.

---

## 🚀 Step-by-Step Setup

### 1. Install Dependencies
Open your terminal in the project directory and run:
```bash
npm install
```

### 2. Configure Environment Variables
Create a file named `.env` in the root of the project and add your MongoDB connection string:
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/catalog_db?retryWrites=true&w=majority
```
*(Replace `<username>` and `<password>` with your database credentials. If running locally, you can use `MONGO_URI=mongodb://127.0.0.1:27017/catalog_db`)*

### 3. Seed 200,000 Products
Run the seeding script to wipe the database and generate 200,000 products:
```bash
npm run seed
```
**How it works so fast:** Instead of inserting products one-by-one in a loop (which takes minutes due to database roundtrips), the script generates batches of 10,000 products in memory and writes them in a single bulk operation using `insertMany()`. The entire 200k database is ready in **3 to 5 seconds**.

### 4. Start the Application
Boot up the Express server:
```bash
npm start
```
You should see:
```text
Successfully connected to MongoDB database: "catalog_db"
Checking/creating indexes for fast pagination...
Database indexes verified successfully.
==================================================
Backend Server is running on http://localhost:3000
==================================================
```

### 5. Browse the Catalog
Open your browser and navigate to:
```text
http://localhost:3000
```
You can now filter by category, change page sizes, and scroll forward and backward instantly!

---

## 💡 How Cursor-Based Pagination Works (Easy Guide)

### The Problem with Offset-Based Pagination (`skip()` in MongoDB)
Normally, developers use `limit()` and `skip()` to paginate:
```javascript
// Page 10,000 with page size 20
db.products.find().sort({ created_at: -1 }).skip(200000).limit(20)
```
- **Why it is SLOW**: To skip 200,000 items, MongoDB has to scan and discard 200,000 documents from disk. As a user navigates deeper, your server load spikes and load times drag.
- **Why it is unstable**: If you are browsing Page 1, and 50 new products are added at the top, every existing product is pushed down. When you click "Next Page" (which requests `skip(20)`), you will see the last 20 products you **already saw** on Page 1 (duplicates).

### The Solution: Cursor-Based Pagination
Instead of telling the database to "skip X items", we tell the database to "start looking *after* the last item I saw". 
The cursor is a base64-encoded string containing the sorting values of the last item on the page: `created_at` (timestamp) and `_id` (unique tie-breaker).

#### The Mathematical SQL/MongoDB Seek Query:
When sorting newest first, the next page query finds documents where:
1. The `created_at` is older than the cursor item's `created_at`.
2. OR, if they have the exact same `created_at`, the `_id` is smaller (older) than the cursor item's `_id` (a fallback to guarantee unique order).

In MongoDB, we express this using the `$or` operator:
```javascript
const query = {
  $or: [
    { created_at: { $lt: cursor.created_at } },
    { created_at: cursor.created_at, _id: { $lt: cursor._id } }
  ]
};
```
#### Why it is super fast:
We create a compound index on `{ category: 1, created_at: -1, _id: -1 }`. When the query executes, MongoDB does not scan any items. It uses B-Tree index traversal to instantly find the cursor location in $O(\log N)$ time, jumping directly to the correct page in **0 to 2 milliseconds**!

---

## 🌐 How to Host Online (Free)

### 1. Database (MongoDB Atlas)
1. Register a free account at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free shared cluster (M0 sandbox).
3. In "Database Access", create a user with a username and password.
4. In "Network Access", allow connections from everywhere (`0.0.0.0/0`) since Render's IP addresses change dynamically.
5. Click **Connect** -> **Drivers** to copy your `mongodb+srv://...` connection string.

### 2. Backend (Render)
1. Push your repository to GitHub.
2. Log in to [Render.com](https://render.com/) and create a new **Web Service**.
3. Link your GitHub repository.
4. Set **Build Command** to `npm install`.
5. Set **Start Command** to `npm start`.
6. In the **Environment** tab, add a new environment variable:
   - Key: `MONGO_URI`
   - Value: `your_mongodb_atlas_connection_string`
7. Click Deploy! Render will build your Express app and serve the dashboard UI globally.
