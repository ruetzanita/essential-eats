// Essential Eats • Recipe Clipper Extension Popup Logic
const API_BASE = "https://essential-eats-api-demo.ruetzanita.workers.dev/api";
const APP_URL = "https://essentialeats.ruetzanita.com/";

let currentRecipe = null;
let activeTabUrl = "";

// Toast helper
function showToast(msg) {
  const el = document.getElementById("extension-toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("visible");
  setTimeout(() => el.classList.remove("visible"), 2500);
}

// Format ISO 8601 duration e.g. PT30M -> 30 mins
function formatDuration(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const match = iso.match(/P(?:([0-9]+)D)?T?(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?/i);
  if (!match) return iso;
  const days = match[1] ? `${match[1]}d ` : '';
  const hours = match[2] ? `${match[2]} hr ` : '';
  const mins = match[3] ? `${match[3]}m` : '';
  return (days + hours + mins).trim() || iso;
}

// Analyze ingredients to detect common dietary categories
function detectDietaryBadges(ingredients) {
  const text = ingredients.join(' ').toLowerCase();
  const badges = [];

  const glutenKeywords = ['wheat', 'flour', 'barley', 'rye', 'bread', 'pasta', 'breadcrumbs', 'soy sauce'];
  const dairyKeywords = ['milk', 'butter', 'cheese', 'heavy cream', 'yogurt', 'parmesan', 'cheddar', 'mozzarella', 'sour cream'];
  const meatKeywords = ['chicken', 'beef', 'pork', 'bacon', 'turkey', 'lamb', 'steak', 'sausage', 'salmon', 'tuna', 'shrimp', 'fish'];
  const nutKeywords = ['peanut', 'almond', 'walnut', 'pecan', 'cashew', 'hazelnut', 'pistachio'];

  if (!glutenKeywords.some(k => text.includes(k))) badges.push('Gluten-Free');
  if (!dairyKeywords.some(k => text.includes(k))) badges.push('Dairy-Free');
  if (!nutKeywords.some(k => text.includes(k))) badges.push('Nut-Free');
  if (!meatKeywords.some(k => text.includes(k))) badges.push('Vegetarian');

  return badges;
}

// Injected into the active browser page to inspect JSON-LD & DOM
function extractRecipeFromPage() {
  function parseDuration(iso) {
    if (!iso || typeof iso !== 'string') return '';
    const match = iso.match(/P(?:([0-9]+)D)?T?(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?/i);
    if (!match) return iso;
    const days = match[1] ? `${match[1]}d ` : '';
    const hours = match[2] ? `${match[2]} hr ` : '';
    const mins = match[3] ? `${match[3]}m` : '';
    return (days + hours + mins).trim() || iso;
  }

  function extractInstructions(inst) {
    if (!inst) return [];
    if (typeof inst === 'string') {
      return inst.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 5);
    }
    if (Array.isArray(inst)) {
      const list = [];
      for (const step of inst) {
        if (typeof step === 'string') {
          if (step.trim()) list.push(step.trim());
        } else if (step && typeof step === 'object') {
          if (step.text) {
            list.push(step.text.trim());
          } else if (step.itemListElement && Array.isArray(step.itemListElement)) {
            for (const sub of step.itemListElement) {
              if (sub && sub.text) list.push(sub.text.trim());
              else if (typeof sub === 'string') list.push(sub.trim());
            }
          }
        }
      }
      return list;
    }
    return [];
  }

  function extractImage(img) {
    if (!img) return '';
    if (typeof img === 'string') return img;
    if (Array.isArray(img)) return extractImage(img[0]);
    if (typeof img === 'object' && img.url) return img.url;
    return '';
  }

  function findRecipes(node) {
    const list = [];
    function walk(n) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) {
        n.forEach(walk);
        return;
      }
      const type = n['@type'];
      const isRecipe = (typeof type === 'string' && type.toLowerCase().includes('recipe')) ||
        (Array.isArray(type) && type.some(t => typeof t === 'string' && t.toLowerCase().includes('recipe')));
      if (isRecipe && (n.name || n.recipeIngredient || n.recipeInstructions)) {
        list.push(n);
      }
      for (const k of Object.keys(n)) {
        if (k !== '@context' && typeof n[k] === 'object') walk(n[k]);
      }
    }
    walk(node);
    return list;
  }

  // 1. Scan Schema.org JSON-LD
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    try {
      const data = JSON.parse(s.textContent);
      const candidates = findRecipes(data);
      if (candidates.length > 0) {
        const r = candidates[0];
        const ingredients = Array.isArray(r.recipeIngredient)
          ? r.recipeIngredient.map(i => typeof i === 'string' ? i.trim() : '').filter(Boolean)
          : [];
        const instructions = extractInstructions(r.recipeInstructions);

        if (ingredients.length > 0 || instructions.length > 0) {
          return {
            title: r.name || r.headline || document.title,
            prepTime: parseDuration(r.prepTime) || "15 mins",
            cookTime: parseDuration(r.cookTime) || "30 mins",
            cookingTemp: "350°F",
            seasoningProfile: [r.recipeCuisine, r.recipeCategory].flat().filter(Boolean).join(', ') || "Standard",
            ingredients: ingredients,
            instructions: instructions,
            scalingNote: r.recipeYield ? (Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield).toString() : "Serves 4",
            chefTip: r.description ? (typeof r.description === 'string' ? r.description.slice(0, 200) : "") : "",
            imageUrl: extractImage(r.image),
            sourceUrl: window.location.href
          };
        }
      }
    } catch (e) {}
  }

  // 2. Fallback DOM selector scan (WPRM, Tasty, etc.)
  const wprmContainer = document.querySelector('.wprm-recipe-container, .tasty-recipes, [itemtype*="Recipe"]');
  if (wprmContainer) {
    const titleEl = wprmContainer.querySelector('.wprm-recipe-name, .tasty-recipes-title, [itemprop="name"], h2');
    const ingEls = wprmContainer.querySelectorAll('.wprm-recipe-ingredient, .tasty-recipe-ingredients li, [itemprop="recipeIngredient"]');
    const stepEls = wprmContainer.querySelectorAll('.wprm-recipe-instruction, .tasty-recipe-instructions li, [itemprop="recipeInstructions"]');
    const imgEl = wprmContainer.querySelector('img');

    const ingredients = Array.from(ingEls).map(el => el.textContent.trim()).filter(Boolean);
    const instructions = Array.from(stepEls).map(el => el.textContent.trim()).filter(Boolean);

    if (ingredients.length > 0 || instructions.length > 0) {
      return {
        title: titleEl ? titleEl.textContent.trim() : document.title,
        prepTime: "15 mins",
        cookTime: "30 mins",
        cookingTemp: "350°F",
        seasoningProfile: "Standard",
        ingredients: ingredients,
        instructions: instructions,
        scalingNote: "Serves 4",
        chefTip: "Extracted directly from webpage DOM.",
        imageUrl: imgEl ? imgEl.src : '',
        sourceUrl: window.location.href
      };
    }
  }

  return null;
}

// Render recipe preview card
function renderPreview(recipe) {
  currentRecipe = recipe;

  // View transition
  document.getElementById("view-scanning").style.display = "none";
  document.getElementById("view-fallback").style.display = "none";
  document.getElementById("view-saved").style.display = "none";
  document.getElementById("view-preview").style.display = "block";

  // Header info
  document.getElementById("preview-title").textContent = recipe.title || "Unnamed Recipe";
  let domain = "Recipe Website";
  try {
    if (recipe.sourceUrl) domain = new URL(recipe.sourceUrl).hostname.replace('www.', '');
  } catch (e) {}
  document.getElementById("preview-domain").textContent = domain;

  // Image
  const imgEl = document.getElementById("preview-image");
  if (recipe.imageUrl) {
    imgEl.src = recipe.imageUrl;
    imgEl.style.display = "block";
  } else {
    imgEl.style.display = "none";
  }

  // Meta pills
  document.getElementById("preview-prep").textContent = recipe.prepTime || "15m prep";
  document.getElementById("preview-cook").textContent = recipe.cookTime || "30m cook";
  document.getElementById("preview-servings").textContent = recipe.scalingNote || "4 Servings";

  // Dietary badges
  const tagsContainer = document.getElementById("dietary-tags");
  tagsContainer.innerHTML = "";
  const badges = detectDietaryBadges(recipe.ingredients || []);
  badges.forEach(b => {
    const chip = document.createElement("span");
    chip.className = "diet-chip";
    chip.textContent = b;
    tagsContainer.appendChild(chip);
  });

  // Ingredients tab
  const ingsList = document.getElementById("preview-ingredients-list");
  ingsList.innerHTML = "";
  const ings = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  document.getElementById("count-ings").textContent = ings.length;
  ings.forEach((ing, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <input type="checkbox" id="ing-chk-${i}" checked>
      <label for="ing-chk-${i}">${ing}</label>
    `;
    ingsList.appendChild(li);
  });

  // Instructions tab
  const stepsList = document.getElementById("preview-instructions-list");
  stepsList.innerHTML = "";
  const steps = Array.isArray(recipe.instructions) ? recipe.instructions : [];
  document.getElementById("count-steps").textContent = steps.length;
  steps.forEach(step => {
    const li = document.createElement("li");
    li.textContent = step;
    stepsList.appendChild(li);
  });

  // Chef notes
  const notesBox = document.getElementById("preview-notes");
  notesBox.textContent = recipe.chefTip || "Clipped clean from " + domain + " with zero advertisements.";

  document.getElementById("status-text").textContent = "Recipe Found";
}

// Show fallback scan view
function showFallback(url) {
  document.getElementById("view-scanning").style.display = "none";
  document.getElementById("view-preview").style.display = "none";
  document.getElementById("view-saved").style.display = "none";
  document.getElementById("view-fallback").style.display = "block";

  const manualInput = document.getElementById("manual-url-input");
  if (manualInput && url) manualInput.value = url;
  document.getElementById("status-text").textContent = "Manual / AI Scan";
}

// Execute AI deep scan via Cloudflare worker
async function runAiDeepScan() {
  const inputEl = document.getElementById("manual-url-input");
  const url = (inputEl && inputEl.value.trim()) || activeTabUrl;
  if (!url || !url.startsWith("http")) {
    showToast("Please enter a valid website link.");
    return;
  }

  const btn = document.getElementById("btn-ai-deep-scan");
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span>Extracting with Gemini 3.8 Flash...</span>`;

  try {
    const res = await fetch(`${API_BASE}/recipes/parse-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const recipeList = Array.isArray(data) ? data : [data];
    if (recipeList.length > 0 && (recipeList[0].ingredients || recipeList[0].instructions)) {
      renderPreview(recipeList[0]);
      showToast("Ad-free recipe extracted via AI!");
    } else {
      throw new Error("No recipe could be extracted from this URL.");
    }
  } catch (err) {
    showToast(`AI Scan failed: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// Save recipe to Essential Eats
async function saveRecipeToApp() {
  if (!currentRecipe) return;

  const btn = document.getElementById("btn-save-recipe");
  btn.disabled = true;
  btn.innerHTML = `<span>Syncing to Essential Eats...</span>`;

  // 1. Store in extension storage
  chrome.storage.local.get(["savedRecipes", "pendingClippedRecipes"], async (res) => {
    const saved = res.savedRecipes || [];
    const pending = res.pendingClippedRecipes || [];

    const newRecipe = {
      ...currentRecipe,
      id: Date.now(),
      savedAt: new Date().toISOString()
    };

    saved.push(newRecipe);
    pending.push(newRecipe);

    await chrome.storage.local.set({ savedRecipes: saved, pendingClippedRecipes: pending });

    // 2. Query open Essential Eats tabs and notify
    let notifiedTab = false;
    try {
      const tabs = await chrome.tabs.query({ url: ["*://essentialeats.ruetzanita.com/*", "*://localhost/*"] });
      for (const t of tabs) {
        chrome.tabs.sendMessage(t.id, { type: "CLIP_RECIPE", recipe: newRecipe }, (resp) => {
          if (chrome.runtime.lastError) return;
        });
        notifiedTab = true;
      }
    } catch (e) {}

    // Show saved view
    document.getElementById("view-preview").style.display = "none";
    document.getElementById("view-saved").style.display = "block";
    document.getElementById("saved-summary-text").textContent = 
      notifiedTab 
        ? `"${newRecipe.title}" has been saved and synced directly to your open Essential Eats kitchen!`
        : `"${newRecipe.title}" saved. It will appear in your Essential Eats Favorites automatically.`;

    btn.disabled = false;
    btn.innerHTML = `<span>Save to Essential Eats</span>`;
  });
}

// Copy clean recipe markdown to clipboard
function copyCleanRecipe() {
  if (!currentRecipe) return;
  const lines = [
    `# ${currentRecipe.title || 'Recipe'}`,
    `Source: ${currentRecipe.sourceUrl || 'Web'}`,
    `Timings: ${currentRecipe.prepTime || '15m'} prep | ${currentRecipe.cookTime || '30m'} cook | ${currentRecipe.scalingNote || '4 servings'}`,
    '',
    '## Ingredients',
    ...(currentRecipe.ingredients || []).map(i => `- ${i}`),
    '',
    '## Instructions',
    ...(currentRecipe.instructions || []).map((step, i) => `${i + 1}. ${step}`)
  ];

  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    showToast("Recipe copied to clipboard without ads!");
  });
}

// Tab navigation handler
function setupTabs() {
  const tabs = [
    { btn: "tab-btn-ings", content: "tab-content-ings" },
    { btn: "tab-btn-steps", content: "tab-content-steps" },
    { btn: "tab-btn-notes", content: "tab-content-notes" }
  ];

  tabs.forEach(({ btn, content }) => {
    document.getElementById(btn).addEventListener("click", () => {
      tabs.forEach(t => {
        document.getElementById(t.btn).classList.remove("active");
        document.getElementById(t.content).style.display = "none";
      });
      document.getElementById(btn).classList.add("active");
      document.getElementById(content).style.display = "block";
    });
  });
}

// Initial Boot
document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();

  // Attach button event listeners
  document.getElementById("btn-save-recipe").addEventListener("click", saveRecipeToApp);
  document.getElementById("btn-copy-recipe").addEventListener("click", copyCleanRecipe);
  document.getElementById("btn-ai-deep-scan").addEventListener("click", runAiDeepScan);

  document.getElementById("btn-open-app").addEventListener("click", () => {
    chrome.tabs.create({ url: APP_URL });
  });

  document.getElementById("btn-view-in-app").addEventListener("click", () => {
    chrome.tabs.create({ url: APP_URL });
  });

  document.getElementById("btn-back-to-preview").addEventListener("click", () => {
    document.getElementById("view-saved").style.display = "none";
    document.getElementById("view-preview").style.display = "block";
  });

  // Query active browser tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.startsWith("http")) {
      showFallback(tab ? tab.url : "");
      return;
    }

    activeTabUrl = tab.url;

    // Execute DOM scanner script on active tab
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractRecipeFromPage
    });

    if (results && results[0] && results[0].result) {
      renderPreview(results[0].result);
    } else {
      showFallback(activeTabUrl);
    }
  } catch (err) {
    console.warn("Could not scan active tab:", err);
    showFallback(activeTabUrl);
  }
});
