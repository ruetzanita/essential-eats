import { API, state, saveShoppingList } from './state.js';
import { normalize } from './utils.js';
import { renderInv, renderStaging, renderSuggestions, renderLibrary, toggleGrocery, renderShop, showToast } from './ui.js';

// --- Local Storage Sandbox Data Keys ---
const INV_KEY = 'kh_sandbox_inventory';
const LIB_KEY = 'kh_sandbox_recipes';

const defaultInventory = [
    { id: 1, name: "Olive Oil", category: "Oils/Vinegars", quantity: 1, unit: "bottle" },
    { id: 2, name: "Kosher Salt", category: "Spices", quantity: 1, unit: "box" },
    { id: 3, name: "Black Pepper", category: "Spices", quantity: 1, unit: "shaker" },
    { id: 4, name: "Garlic", category: "Fresh", quantity: 3, unit: "heads" },
    { id: 5, name: "Onions", category: "Fresh", quantity: 4, unit: "count" },
    { id: 6, name: "Chicken Breast", category: "Meat", quantity: 2, unit: "lbs" },
    { id: 7, name: "Jasmine Rice", category: "Pantry", quantity: 5, unit: "lbs" },
    { id: 8, name: "Canned Crushed Tomatoes", category: "Canned", quantity: 2, unit: "cans" },
    { id: 9, name: "Spinach", category: "Fresh", quantity: 0, unit: "bunch" },
    { id: 10, name: "Dijon Mustard", category: "Canned", quantity: 0, unit: "jar" }
];

const defaultRecipes = [
    {
        id: 101,
        title: "Pan-Seared Garlic Olive Oil Chicken",
        prepTime: "10 mins",
        cookTime: "15 mins",
        cookingTemp: "Medium-High",
        seasoningProfile: "Pungent garlic, freshly cracked black pepper, sea salt with rich olive oil finish",
        ingredients: ["2 lbs Chicken Breast", "4 cloves Garlic, crushed", "2 tbsp Olive Oil", "Kosher Salt to taste", "Black Pepper to taste"],
        instructions: [
            "Pat chicken dry with paper towels; season all sides generously with salt and pepper.",
            "Heat olive oil in a heavy stainless or cast-iron skillet over medium-high heat until shimmering.",
            "Carefully lay in the chicken breasts. Sear undisturbed for 6-7 minutes until a deep golden crust forms.",
            "Flip, add crushed garlic, and baste the chicken with the infused oil for 5-6 minutes until internal temp reaches 165°F.",
            "Transfer to a warm cutting board and rest for 5 minutes before slicing against the grain."
        ],
        scalingNote: "Yields 4 servings - scales cleanly",
        chefTip: "Never crowd the skillet. Searing requires dry surfaces and ample space for steam to escape, which guarantees a glass-like caramelized crust."
    },
    {
        id: 102,
        title: "Rustic Tomato & Golden Onion Rice Pilaf",
        prepTime: "10 mins",
        cookTime: "25 mins",
        cookingTemp: "Low Simmer",
        seasoningProfile: "Caramelized alliums, sweet acidic tomato reduction, gentle toasted grain umami",
        ingredients: ["1.5 cups Jasmine Rice", "1 can Canned Crushed Tomatoes", "1 large Onion, finely diced", "2 tbsp Olive Oil", "2 cups Water or stock", "Kosher Salt and Black Pepper to taste"],
        instructions: [
            "Warm olive oil in a medium saucepan over medium heat; add diced onions with a pinch of salt.",
            "Sweat onions slowly for 7-8 minutes until deeply translucent and lightly golden around the edges.",
            "Stir in raw rice and toast for 2 full minutes until grains become opaque and fragrant.",
            "Pour in crushed tomatoes and water; bring to a rolling boil.",
            "Cover tightly with lid, reduce heat to low, and simmer undisturbed for 17 minutes.",
            "Remove from heat, let steam covered for 5 minutes, then fluff with a fork."
        ],
        scalingNote: "Yields 4 generous sides",
        chefTip: "Toasting the dry rice grains in the hot oil creates a protective starch barrier that keeps individual rice grains distinct rather than gummy."
    }
];

export function seedDatabase() {
    if (!localStorage.getItem(INV_KEY)) {
        localStorage.setItem(INV_KEY, JSON.stringify(defaultInventory));
    }
    let currentLib = [];
    try {
        currentLib = JSON.parse(localStorage.getItem(LIB_KEY) || '[]');
    } catch(e) {}
    
    if (!currentLib || !Array.isArray(currentLib) || currentLib.length === 0 || currentLib.every(r => !r)) {
        localStorage.setItem(LIB_KEY, JSON.stringify(defaultRecipes));
    }
}
seedDatabase();

export function getLocalInventory() {
    return JSON.parse(localStorage.getItem(INV_KEY)) || [];
}

export function saveLocalInventory(inv) {
    localStorage.setItem(INV_KEY, JSON.stringify(inv));
}

export function getLocalRecipes() {
    return JSON.parse(localStorage.getItem(LIB_KEY)) || [];
}

export function saveLocalRecipes(recipes) {
    localStorage.setItem(LIB_KEY, JSON.stringify(recipes));
}

export function getDietaryRestrictions() {
    const restrictions = [];
    if (document.getElementById('toggle-gf')?.checked) restrictions.push('Gluten-Free');
    if (document.getElementById('toggle-df')?.checked) restrictions.push('Dairy-Free');
    if (document.getElementById('toggle-nf')?.checked) restrictions.push('Nut-Free');
    if (document.getElementById('toggle-v')?.checked) restrictions.push('Vegetarian');
    if (document.getElementById('toggle-vegan')?.checked) restrictions.push('Vegan');
    if (document.getElementById('toggle-keto')?.checked) restrictions.push('Low-Carb / Keto');
    return restrictions;
}

// --- CRUD Operations (Sandbox Local Data Shard) ---
export async function fetchInv() {
    renderInv(getLocalInventory());
}

export async function updateQty(id, adjustment, currentQty) {
    const newQty = Math.max(0, currentQty + adjustment);
    const inv = getLocalInventory();
    const item = inv.find(i => i.id === id);
    if (item) {
        item.quantity = newQty;
        saveLocalInventory(inv);
        if (adjustment > 0 && currentQty === 0) {
            showToast(`Restocked "${item.name}" (Qty: ${newQty})`, "success");
        }
    }
    fetchInv();
}

export async function deleteItem(id, name) {
    let inv = getLocalInventory();
    inv = inv.filter(i => i.id !== id);
    saveLocalInventory(inv);
    showToast(`Removed "${name}" from pantry`, "info");
    fetchInv();
}

export async function fetchLibrary() {
    renderLibrary(getLocalRecipes());
}

export async function saveRecipe(index) {
    const recipe = state.suggestionsStore[index];
    if (!recipe) return;
    const recipes = getLocalRecipes();
    const clone = { ...recipe, id: Date.now() };
    recipes.push(clone);
    saveLocalRecipes(recipes);
    showToast(`"${clone.title || 'Recipe'}" saved to Favorites!`, "success");
}

export async function deleteRecipe(event, id) {
    event.stopPropagation();
    let recipes = getLocalRecipes();
    recipes = recipes.filter(r => r.id !== id);
    saveLocalRecipes(recipes);
    showToast("Recipe removed from favorites.", "info");
    fetchLibrary();
}

// --- AI Operations (Cloudflare API with Sandbox Protection) ---

export async function parseGrocery() {
    const rawInput = document.getElementById('raw-input').value.trim();
    if (!rawInput) {
        showToast("Please paste receipt text or upload an image first.", "warning");
        return;
    }
    
    document.getElementById('staging-area').innerHTML = "<p style='color:var(--text-accent); text-align:center; padding:20px;'><i class='ph ph-spinner ph-spin' style='font-size:1.4rem; vertical-align:middle; margin-right:8px;'></i> Analyzing with Gemini 3.8 Flash Deep Crawler...</p>";
    
    try {
        const inventory = getLocalInventory();
        const res = await fetch(`${API}/grocery/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawText: rawInput, inventory })
        });
        
        if (res.status === 429) {
            document.getElementById('staging-area').innerHTML = "<p style='color:var(--danger); text-align:center;'>Sandbox rate limit reached (5 requests/day). Please try again tomorrow.</p>";
            showToast("Rate limit exceeded (5 requests/day per IP).", "warning");
            return;
        }

        if (!res.ok) {
            let errorMsg = "API Error";
            try {
                const errData = await res.json();
                errorMsg = errData.error?.message || errData.error || res.statusText;
                if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg);
            } catch(e) {}
            throw new Error(errorMsg);
        }

        const rawData = await res.json();
        state.stagingData = normalize(rawData, 'item');
        renderStaging();
        showToast(`Parsed ${state.stagingData.length} items ready for review!`, "success");
    } catch (e) {
        document.getElementById('staging-area').innerHTML = `<p style='color:var(--danger); text-align:center;'>Parsing failed: ${e.message}</p>`;
        showToast(`Receipt parse error: ${e.message}`, "danger");
    }
}

// Multimodal camera / photo upload handler
export async function handleReceiptImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    document.getElementById('staging-area').innerHTML = "<p style='color:var(--text-accent); text-align:center; padding:20px;'><i class='ph ph-spinner ph-spin' style='font-size:1.4rem; vertical-align:middle; margin-right:8px;'></i> Compressing receipt image & running OCR...</p>";

    try {
        const base64Data = await resizeAndEncodeImage(file, 1200);
        const inventory = getLocalInventory();

        const res = await fetch(`${API}/grocery/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                imageBase64: base64Data, 
                mimeType: 'image/jpeg', 
                inventory 
            })
        });

        if (res.status === 429) {
            document.getElementById('staging-area').innerHTML = "<p style='color:var(--danger); text-align:center;'>Rate limit exceeded (5 requests/day). Please try again later.</p>";
            showToast("Rate limit reached (5 req/day).", "warning");
            return;
        }

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error?.message || errData.error || res.statusText);
        }

        const rawData = await res.json();
        state.stagingData = normalize(rawData, 'item');
        renderStaging();
        showToast(`Visual OCR Extracted ${state.stagingData.length} items!`, "success");
    } catch (err) {
        document.getElementById('staging-area').innerHTML = `<p style='color:var(--danger); text-align:center;'>Image OCR failed: ${err.message}</p>`;
        showToast(`Image OCR failed: ${err.message}`, "danger");
    } finally {
        event.target.value = '';
    }
}

// Helper to resize large photos before transmitting to Gemini
function resizeAndEncodeImage(file, maxDimension = 1200) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Smart grocery commit with automatic shopping list deduction
export async function commitGrocery() {
    if (!state.stagingData || state.stagingData.length === 0) return;
    
    try {
        const inv = getLocalInventory();
        let maxId = inv.reduce((max, item) => Math.max(max, item.id || 0), 0);
        
        state.stagingData.forEach(item => {
            // Check if item already exists by name
            const existing = inv.find(i => (i.name || '').toLowerCase() === (item.name || '').toLowerCase());
            if (existing) {
                existing.quantity = (existing.quantity || 0) + (item.quantity || 1);
                if (item.category) existing.category = item.category;
            } else {
                maxId++;
                inv.push({
                    id: maxId,
                    name: item.name || "Unknown Item",
                    category: item.category || "Pantry",
                    quantity: item.quantity || 1,
                    unit: item.unit || "count"
                });
            }
        });
        saveLocalInventory(inv);

        // Smart Grocery Auto-Deduction
        const committedNames = state.stagingData.map(i => (i.name || "").toLowerCase().trim());
        let removedCount = 0;
        state.shoppingList = state.shoppingList.filter(shopItem => {
            const shopLower = shopItem.toLowerCase().trim();
            const isBought = committedNames.some(cName => cName.includes(shopLower) || shopLower.includes(cName));
            if (isBought) removedCount++;
            return !isBought;
        });

        if (removedCount > 0) {
            saveShoppingList();
            renderShop();
            showToast(`Smart Sort: Automatically crossed off ${removedCount} item(s) from your Shopping List!`, "success");
        } else {
            showToast(`Committed ${state.stagingData.length} items to pantry inventory!`, "success");
        }

        state.stagingData = [];
        const stagingEl = document.getElementById('staging-area');
        if (stagingEl) stagingEl.innerHTML = '';
        const rawInput = document.getElementById('raw-input');
        if (rawInput) rawInput.value = '';
        toggleGrocery();
        fetchInv();
        
    } catch (e) {
        console.error("Commit error:", e);
        showToast("Error committing items.", "danger");
    }
}

export async function getSuggestions() {
    const div = document.getElementById('suggestions');
    div.innerHTML = "<p style='padding:25px; color:var(--text-accent); text-align:center;'><i class='ph ph-spinner ph-spin' style='font-size:1.5rem; vertical-align:middle; margin-right:8px;'></i> Formulating Michelin Chef recipes with Gemini 3.8 Flash...</p>";
    div.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const inventory = getLocalInventory();
        const restrictions = getDietaryRestrictions();
        
        const res = await fetch(`${API}/suggest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inventory, restrictions })
        });
        
        if (res.status === 429) {
            div.innerHTML = "<p style='padding:20px; color:var(--danger); text-align:center;'>Sandbox limit reached (5 requests/day per IP). Please revisit tomorrow!</p>";
            showToast("Rate limit exceeded.", "warning");
            return;
        }
        
        if (!res.ok) {
            let errorMsg = "API Error";
            try {
                const errData = await res.json();
                errorMsg = errData.error?.message || errData.error || res.statusText;
                if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg);
            } catch(e) {}
            throw new Error(errorMsg);
        }
        
        const rawData = await res.json();
        state.suggestionsStore = normalize(rawData, 'recipe');
        renderSuggestions();
        showToast("Generated 5 bespoke Michelin Chef recipes!", "success");
    } catch (e) {
        div.innerHTML = `<p style='padding:20px; color:var(--danger); text-align:center;'>Suggestions unavailable: ${e.message}</p>`;
        showToast(`Failed to generate recipes: ${e.message}`, "danger");
    }
}

export async function importRecipes() {
    const rawText = document.getElementById('recipe-import-input').value.trim();
    if (!rawText) {
        showToast("Please enter recipe text to import.", "warning");
        return;
    }

    try {
        showToast("Importing and standardizing recipes...", "info");
        const res = await fetch(`${API}/recipes/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawText })
        });

        if (res.status === 429) {
            showToast("Rate limit exceeded (5 requests/day).", "warning");
            return;
        }

        if (!res.ok) {
            let errorMsg = "API Error";
            try {
                const errData = await res.json();
                errorMsg = errData.error?.message || errData.error || res.statusText;
            } catch(e) {}
            throw new Error(errorMsg);
        }
        
        const rawData = await res.json();
        const parsedRecipes = normalize(rawData, 'recipe');
        
        const recipes = getLocalRecipes();
        let maxId = recipes.reduce((max, r) => Math.max(max, r.id || 0), Date.now());
        parsedRecipes.forEach(r => {
            maxId++;
            r.id = maxId;
            recipes.push(r);
        });
        saveLocalRecipes(recipes);
        
        showToast(`Successfully imported ${parsedRecipes.length} recipe(s)!`, "success");
        document.getElementById('recipe-import-input').value = '';
        document.getElementById('import-portal').style.display = 'none';
        fetchLibrary();
    } catch (e) {
        console.error("Import failed:", e);
        showToast(`Import failed: ${e.message}`, "danger");
    }
}

export async function importRecipeFromUrl(customUrl) {
    const inputEl = document.getElementById('recipe-url-input');
    const url = (customUrl || (inputEl ? inputEl.value : '')).trim();
    if (!url) {
        showToast("Please enter a recipe link to import.", "warning");
        return;
    }

    const btn = document.getElementById('btn-parse-url');
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class='ph ph-spinner ph-spin'></i> Extracting Clean Recipe...`;
    }

    try {
        showToast("Fetching recipe & stripping web ads...", "info");
        const res = await fetch(`${API}/recipes/parse-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (res.status === 429) {
            showToast("Sandbox rate limit reached (5 requests/day).", "warning");
            return;
        }

        if (!res.ok) {
            let errorMsg = "Extraction failed";
            try {
                const errData = await res.json();
                errorMsg = errData.error?.message || errData.error || res.statusText;
            } catch(e) {}
            throw new Error(errorMsg);
        }

        const rawData = await res.json();
        const parsedRecipes = normalize(rawData, 'recipe');
        if (!parsedRecipes || parsedRecipes.length === 0) {
            throw new Error("No recipe found at the specified URL.");
        }

        const recipes = getLocalRecipes();
        let maxId = recipes.reduce((max, r) => Math.max(max, r.id || 0), Date.now());
        parsedRecipes.forEach(r => {
            maxId++;
            r.id = maxId;
            recipes.push(r);
        });
        saveLocalRecipes(recipes);

        showToast(`Saved "${parsedRecipes[0].title}" to Favorites!`, "success");
        if (inputEl) inputEl.value = '';
        const portal = document.getElementById('url-import-portal');
        if (portal) portal.style.display = 'none';

        if (typeof window.switchView === 'function') {
            window.switchView('view-lib');
        }
        fetchLibrary();
    } catch (e) {
        console.error("URL Import failed:", e);
        showToast(`URL Import failed: ${e.message}`, "danger");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    }
}

export function saveClippedRecipe(recipe) {
    if (!recipe || !recipe.title) return false;
    const recipes = getLocalRecipes();
    const maxId = recipes.reduce((max, r) => Math.max(max, r.id || 0), Date.now()) + 1;
    let domain = "web";
    try {
        if (recipe.sourceUrl) domain = new URL(recipe.sourceUrl).hostname;
    } catch(e) {}

    const cleanRecipe = {
        ...recipe,
        id: maxId,
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
        scalingNote: recipe.scalingNote || "Clipped Recipe",
        chefTip: recipe.chefTip || (recipe.sourceUrl ? `Clipped directly from ${domain}` : "Saved from Essential Eats Clipper")
    };
    recipes.push(cleanRecipe);
    saveLocalRecipes(recipes);
    showToast(`Clipped "${cleanRecipe.title}" to Favorites!`, "success");
    fetchLibrary();
    return true;
}

