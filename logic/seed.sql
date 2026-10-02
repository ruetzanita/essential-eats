-- Schema for Kitchen Hub Demo

DROP TABLE IF EXISTS DemoRateLimits;
CREATE TABLE DemoRateLimits (
    ip TEXT PRIMARY KEY,
    count INTEGER,
    date TEXT
);

DROP TABLE IF EXISTS DemoCache;
CREATE TABLE DemoCache (
    promptHash TEXT PRIMARY KEY,
    response TEXT
);
DROP TABLE IF EXISTS Inventory;
CREATE TABLE Inventory (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    quantity INTEGER,
    category TEXT
);

DROP TABLE IF EXISTS Recipes;
CREATE TABLE Recipes (
    recipe_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT UNIQUE,
    ingredients TEXT,
    instructions TEXT,
    scaling_note TEXT
);

-- Seed Data

INSERT INTO Inventory (name, quantity, category) VALUES
    ('Organic Chicken Breast', 3, 'Meat'),
    ('Kale', 1, 'Fresh'),
    ('Quinoa', 2, 'Pantry'),
    ('Sriracha', 1, 'Condiments'),
    ('Garlic', 5, 'Fresh'),
    ('Olive Oil', 1, 'Oils & Vinegars'),
    ('Sweet Potatoes', 4, 'Fresh'),
    ('Tamari', 1, 'Condiments'),
    ('Rosemary', 1, 'Spices & Seasoning'),
    ('Ground Beef', 2, 'Meat');

INSERT INTO Recipes (title, ingredients, instructions, scaling_note) VALUES
    ('Spicy Chicken Quinoa Bowl', '["Organic Chicken Breast", "Kale", "Quinoa", "Sriracha", "Garlic", "Olive Oil"]', '["Cook quinoa according to package directions.", "Sauté garlic and kale in olive oil until wilted.", "Grill or pan-sear chicken breast.", "Assemble bowls with quinoa, kale, and sliced chicken.", "Drizzle with Sriracha before serving."]', 'Cook extra chicken to save for lunch the next day.'),
    ('Rosemary Sweet Potato Hash', '["Sweet Potatoes", "Olive Oil", "Rosemary", "Garlic"]', '["Dice sweet potatoes.", "Toss with olive oil, rosemary, and minced garlic.", "Roast at 400°F for 25-30 minutes until crispy."]', 'Can be made ahead and reheated.'),
    ('Tamari Beef Stir-fry', '["Ground Beef", "Tamari", "Garlic", "Olive Oil"]', '["Brown ground beef in a skillet with olive oil.", "Add minced garlic and cook until fragrant.", "Stir in tamari and simmer for 2 minutes."]', 'Serve over rice or quinoa.');
