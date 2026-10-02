-- Essential Eats / Kitchen Hub Database Schema
-- Compatible with Cloudflare D1 (SQLite)

-- Rate limiting for public sandbox demo
CREATE TABLE IF NOT EXISTS DemoRateLimits (
    ip TEXT PRIMARY KEY,
    count INTEGER,
    date TEXT
);

-- Edge prompt caching for cost & quota protection
CREATE TABLE IF NOT EXISTS DemoCache (
    promptHash TEXT PRIMARY KEY,
    response TEXT
);

-- Inventory tracking
CREATE TABLE IF NOT EXISTS Inventory (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    quantity REAL NOT NULL DEFAULT 0
);

-- Recipe library
CREATE TABLE IF NOT EXISTS Recipes (
    recipe_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    ingredients TEXT NOT NULL,       -- JSON string array: ["2 lbs Chicken", ...]
    instructions TEXT NOT NULL,      -- JSON string array: ["Sear chicken...", ...]
    scaling_note TEXT                -- String: "Yields 4 servings"
);