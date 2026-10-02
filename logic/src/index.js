import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Worker crashed", message: err.message, stack: err.stack }, 500);
});

const API_METADATA = {
  status: "online",
  service: "Essential Eats API (Kitchen Hub Sandbox Demo)",
  version: "2026.09.27-C",
  build: "2026.10.02-A",
  rateLimit: "5 requests/day per IP",
  endpoints: [
    { path: "/", method: "GET", description: "Health check & service metadata" },
    { path: "/api", method: "GET", description: "Health check & service metadata" },
    { path: "/api/grocery/parse", method: "POST", description: "AI receipt ingestion (text or image) with context matching" },
    { path: "/api/suggest", method: "POST", description: "Nourishing supper 5-recipe generator with strict dietary guardrails" },
    { path: "/api/recipes/import", method: "POST", description: "Bulk unstructured recipe text parsing" },
    { path: "/api/recipes/parse-url", method: "POST", description: "Clean URL recipe extraction via Schema.org JSON-LD and Gemini 3.8 Flash" }
  ]
};

app.get('/', (c) => c.json(API_METADATA));
app.get('/api', (c) => c.json(API_METADATA));
app.get('/api/grocery/parse', (c) => c.text('Essential Eats Worker is alive! Use POST to submit receipt data or images.'));

async function checkRateLimit(c) {
  // Use Cloudflare-verified edge connecting IP; fall back to demo-client if unavailable (prevents X-Forwarded-For header spoofing)
  const ip = c.req.header('cf-connecting-ip') || 'demo-client';
  const today = new Date().toISOString().split('T')[0];
  
  if (!c.env.essential_eats_db) {
    // If running in an environment without D1 bound, allow request
    return true;
  }

  try {
    const record = await c.env.essential_eats_db.prepare(
      "SELECT count, date FROM DemoRateLimits WHERE ip = ?"
    ).bind(ip).first();
    
    if (!record || record.date !== today) {
      await c.env.essential_eats_db.prepare(
        "INSERT INTO DemoRateLimits (ip, count, date) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET count = 1, date = excluded.date"
      ).bind(ip, today).run();
      return true;
    }
    
    if (record.count >= 5) {
      return false;
    }
    
    await c.env.essential_eats_db.prepare(
      "UPDATE DemoRateLimits SET count = count + 1 WHERE ip = ?"
    ).bind(ip).run();
    return true;
  } catch (err) {
    console.warn("Rate limit check error:", err);
    return true;
  }
}

async function getCachedResponse(c, promptStr) {
  if (!c.env.essential_eats_db) return null;
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(promptStr));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const record = await c.env.essential_eats_db.prepare(
      "SELECT response FROM DemoCache WHERE promptHash = ?"
    ).bind(hashHex).first();
    if (record) return record.response;
    return null;
  } catch (err) {
    console.warn("Cache fetch error:", err);
    return null;
  }
}

async function setCachedResponse(c, promptStr, responseText) {
  if (!c.env.essential_eats_db) return;
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(promptStr));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    await c.env.essential_eats_db.prepare(
      "INSERT INTO DemoCache (promptHash, response) VALUES (?, ?) ON CONFLICT(promptHash) DO NOTHING"
    ).bind(hashHex, responseText).run();
  } catch (err) {
    console.warn("Cache write error:", err);
  }
}

// --- /api/grocery/parse (Gemini 3.8 Flash with context & multipack unpacking) ---
app.post('/api/grocery/parse', async (c) => {
  const isAllowed = await checkRateLimit(c);
  if (!isAllowed) return c.json({ error: "Sandbox rate limit exceeded (5 requests/day). Please try again tomorrow." }, 429);

  const body = await c.req.json();
  const { rawText, imageBase64, mimeType, inventory } = body;

  if (!rawText && !imageBase64) {
    return c.json({ error: "Missing receipt text or image payload." }, 400);
  }
  if (rawText && typeof rawText === 'string' && rawText.length > 20000) {
    return c.json({ error: "Receipt text payload exceeds maximum allowed length (20,000 characters)." }, 400);
  }

  const existingItemsContext = (Array.isArray(inventory) && inventory.length > 0)
    ? `\nCurrent Pantry Reference (align categories if item already exists):\n${inventory.slice(0, 40).map(i => `${i.name} (${i.category})`).join(', ')}`
    : '';

  const prompt = `You are a precision grocery receipt ingestion engine.
Translate the input into a strict JSON array of grocery items.

OUTPUT SCHEMA:
[
  {
    "name": "Item Name",
    "quantity": 1,
    "category": "Category",
    "unit": "count"
  }
]

CANONICAL CATEGORIES:
- Fresh (or Produce)
- Meat
- Beverages
- Pantry
- Canned (or Condiments)
- Oils/Vinegars (or Oils & Vinegars)
- Spices (or Spices & Seasoning)
- Frozen Foods
- Snacks
- Pets
- Household

DISAMBIGUATION & EXTRACTION RULES:
1. Multipack Unpacking (CRITICAL):
   - "12-pack Wet Cat Food" -> name: "Wet Cat Food", quantity: 12, category: "Pets"
   - "2x 6pk Soda" -> name: "Soda", quantity: 12, category: "Beverages"
   - "1 Dozen Eggs" -> name: "Eggs", quantity: 12, category: "Fresh"
   - "3-pack Romaine Hearts" -> name: "Romaine Hearts", quantity: 3, category: "Fresh"
2. Brand Stripping:
   - "Lays Kettle Chips" -> "Kettle Chips"
   - "Tyson Chicken Breast" -> "Chicken Breast"
   - "Concord Grape Juice" -> "Grape Juice"
   - Convert all names to clean Title Case generic food items.
3. Strict Department Categorization:
   - Cat/dog food, litter, pet treats -> "Pets"
   - Chips, pretzels, cookies, candy -> "Snacks"
   - Vinegar, olive oil, canola oil -> "Oils/Vinegars"
   - Salt, pepper, paprika, curry powder -> "Spices"
   - Paper towels, detergent, soap -> "Household"
${existingItemsContext}`;

  const cacheKey = `parse:${rawText || ''}:${imageBase64 ? imageBase64.slice(0, 80) : ''}`;
  const cached = await getCachedResponse(c, cacheKey);
  if (cached) return new Response(cached, { headers: { 'Content-Type': 'application/json' } });

  const model = c.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${c.env.GEMINI_API_KEY}`;

  const parts = [];
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
      }
    });
  }
  if (rawText) {
    parts.push({ text: `Receipt Raw Text:\n${rawText}` });
  }
  parts.push({ text: prompt });

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { response_mime_type: "application/json" }
    })
  });

  const data = await response.json();
  if (data.error) return c.json({ error: data.error }, 400);
  if (!data.candidates || data.candidates.length === 0) {
    return c.json({ error: { message: "AI response was empty or blocked by safety filters." } }, 400);
  }

  const cleanText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
  await setCachedResponse(c, cacheKey, cleanText);
  return new Response(cleanText, { headers: { 'Content-Type': 'application/json' } });
});

// --- /api/suggest (Nourishing Supper Engine with selectable dietary guardrails) ---
app.post('/api/suggest', async (c) => {
  const isAllowed = await checkRateLimit(c);
  if (!isAllowed) return c.json({ error: "Sandbox rate limit exceeded (5 requests/day). Please try again tomorrow." }, 429);

  const { inventory, restrictions } = await c.req.json();
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const incomingRestrictions = Array.isArray(restrictions) ? restrictions : [];

  // Allergen & dietary restriction definitions for selected guardrails
  const restrictionDefinitions = {
    "gluten-free": "Gluten-Free (no wheat, barley, rye, standard bread, breadcrumbs, standard soy sauce)",
    "gf": "Gluten-Free (no wheat, barley, rye, standard bread, breadcrumbs, standard soy sauce)",
    "dairy-free": "Dairy-Free (no butter, milk, cheese, cream, yogurt, dairy ghee)",
    "df": "Dairy-Free (no butter, milk, cheese, cream, yogurt, dairy ghee)",
    "nut-free": "Nut-Free (no peanuts, almonds, walnuts, cashews, tree nuts)",
    "vegetarian": "Vegetarian (no meat, poultry, seafood, fish, gelatin)",
    "veg": "Vegetarian (no meat, poultry, seafood, fish, gelatin)",
    "vegan": "Vegan (no animal products, meat, poultry, seafood, dairy, eggs, honey)",
    "low-carb / keto": "Low-Carb / Keto (minimal sugars, starches, grains, high net carbs)",
    "keto": "Low-Carb / Keto (minimal sugars, starches, grains, high net carbs)"
  };

  const combinedRestrictions = incomingRestrictions.map(r => {
    const key = (r || '').toLowerCase().trim();
    return restrictionDefinitions[key] || r;
  });

  // Select protein & fresh anchors
  const isVegetarianOrVegan = combinedRestrictions.some(r => r.toLowerCase().includes("vegetarian") || r.toLowerCase().includes("vegan"));
  const proteins = safeInventory.filter(i => {
    if ((i.quantity || 0) <= 0) return false;
    if (isVegetarianOrVegan) {
      return ['Legumes', 'Pantry', 'Fresh', 'Produce'].includes(i.category) && !['Meat'].includes(i.category);
    }
    return ['Meat', 'Frozen Foods'].includes(i.category);
  });
  const mainProtein = proteins.length > 0 
    ? proteins[Math.floor(Math.random() * proteins.length)].name 
    : (isVegetarianOrVegan ? "plant-based protein, legumes, or fresh produce anchor" : "any protein or plant-based main available");

  const freshItems = safeInventory.filter(i => (i.quantity || 0) > 0 && ['Fresh', 'Produce'].includes(i.category)).map(i => i.name).join(", ");
  const pantryItems = safeInventory.filter(i => (i.quantity || 0) > 0 && !['Fresh', 'Produce', 'Meat'].includes(i.category)).map(i => i.name).join(", ");

  const systemInstructionText = `You are an encouraging, culinary-wise AI and trusted kitchen companion.
Your mission is two-fold (The Balance of the Scale):
1. THE PRACTICAL ANCHOR: Ground each recipe strictly in the user's available pantry and fresh ingredients, respecting dietary safety without requiring unnecessary or missing items. Keep recipes accessible (around 3-6 ingredients typical for home meals).
2. THE NOURISH NOTE: Make every meal feel intentional, comforting, and special—never like an afterthought or rushed chore.

You MUST output an array of EXACTLY 5 complete JSON recipe objects.

JSON OBJECT SPECIFICATION:
{
  "title": string,
  "prepTime": string (e.g. "15 mins"),
  "cookTime": string (e.g. "20 mins"),
  "cookingTemp": string (e.g. "375°F / Medium heat"),
  "seasoningProfile": string (warm description of herbs, spices, or aromatics),
  "ingredients": array of strings (prioritizing listed pantry items and basic staples; keep accessible and realistic),
  "instructions": array of strings (clear, reassuring step-by-step culinary guidance),
  "scalingNote": string (e.g. "Serves 4 - comforting family supper"),
  "chefTip": string (CRITICAL: "Nourish Note". 2-3 sentences max. Short, sweet, and encouraging—no essays or flowery language. Highlight 1 ingredient or simple trick that makes this meal feel special tonight, plus 1 easy swap for next time, e.g. "Save this: chicken tonight, but pork or tofu works great next week!")
}

CRITICAL RULES:
1. Feature ${mainProtein} thoughtfully, honoring the ingredients available.
${combinedRestrictions.length > 0
  ? `2. DIETARY RESTRICTIONS (MANDATORY & ZERO-TOLERANCE FOR SELECTED GUARDRAILS):
${combinedRestrictions.map(r => `   - STRICT: ${r}`).join('\n')}
   Zero cross-contamination or suggestions of restricted ingredients.`
  : `2. DIETARY RESTRICTIONS:
   Open dietary profile (no active dietary restrictions). Freely utilize available pantry staples while maintaining comforting, wholesome standards.`}
3. Every single recipe MUST include a distinct "chefTip" (Nourish Note): 2-3 sentences max, with 1 practical flavor/nourish touch and 1 adaptable swap for next time.`;

  const prompt = `CURRENT PANTRY STATE:
- Primary Protein / Centerpiece: ${mainProtein}
- Fresh Produce Available: ${freshItems || "standard kitchen aromatics"}
- Pantry & Dry Goods: ${pantryItems || "olive oil, salt, pepper, basic spices"}

Create 5 inspired meals that strictly conform to all culinary guidelines and safety restrictions.`;

  const cacheKey = `suggest:${mainProtein}:${freshItems}:${combinedRestrictions.join('|')}`;
  const cached = await getCachedResponse(c, cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return c.json(parsed);
    } catch (e) {}
  }

  const model = c.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${c.env.GEMINI_API_KEY}`;

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstructionText }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              prepTime: { type: "STRING" },
              cookTime: { type: "STRING" },
              cookingTemp: { type: "STRING" },
              seasoningProfile: { type: "STRING" },
              ingredients: { type: "ARRAY", items: { type: "STRING" } },
              instructions: { type: "ARRAY", items: { type: "STRING" } },
              scalingNote: { type: "STRING" },
              chefTip: { type: "STRING" }
            },
            required: [
              "title", "prepTime", "cookTime", "cookingTemp", 
              "seasoningProfile", "ingredients", "instructions", 
              "scalingNote", "chefTip"
            ]
          }
        }
      }
    })
  });

  const data = await response.json();
  if (data.error) return c.json({ error: data.error }, 400);
  if (!data.candidates || data.candidates.length === 0) {
    return c.json({ error: { message: "AI generation blocked by safety filters." } }, 400);
  }

  const cleanText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
  await setCachedResponse(c, cacheKey, cleanText);

  try {
    const parsed = JSON.parse(cleanText);
    return c.json(parsed);
  } catch (e) {
    return new Response(cleanText, { headers: { 'Content-Type': 'application/json' } });
  }
});

// --- /api/recipes/import (Unstructured recipe text ingestion) ---
app.post('/api/recipes/import', async (c) => {
  const isAllowed = await checkRateLimit(c);
  if (!isAllowed) return c.json({ error: "Sandbox rate limit exceeded (5 requests/day)." }, 429);

  const { rawText } = await c.req.json();
  if (!rawText) return c.json({ error: "Missing recipe text." }, 400);
  if (typeof rawText === 'string' && rawText.length > 20000) {
    return c.json({ error: "Recipe text exceeds maximum allowed length (20,000 characters)." }, 400);
  }

  const prompt = `Parse this unstructured culinary text into a JSON array of standardized recipe objects.
Schema:
[
  {
    "title": "Recipe Title",
    "prepTime": "15 mins",
    "cookTime": "30 mins",
    "cookingTemp": "350°F",
    "seasoningProfile": "Herbal, Garlic",
    "ingredients": ["Item 1", "Item 2"],
    "instructions": ["Step 1", "Step 2"],
    "scalingNote": "Serves 4",
    "chefTip": "Culinary tip or substitution"
  }
]
Data: ${rawText}`;

  const cached = await getCachedResponse(c, `import:${rawText.slice(0, 100)}`);
  if (cached) return new Response(cached, { headers: { 'Content-Type': 'application/json' } });

  const model = c.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${c.env.GEMINI_API_KEY}`;

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: "application/json" }
    })
  });

  const data = await response.json();
  if (data.error) return c.json({ error: data.error }, 400);
  if (!data.candidates || data.candidates.length === 0) {
    return c.json({ error: { message: "AI response was empty." } }, 400);
  }

  const cleanText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
  await setCachedResponse(c, `import:${rawText.slice(0, 100)}`, cleanText);
  return new Response(cleanText, { headers: { 'Content-Type': 'application/json' } });
});

// --- Helpers for Schema.org Recipe Parsing ---
function formatIsoDuration(str) {
  if (!str || typeof str !== 'string') return '';
  const match = str.match(/P(?:([0-9]+)D)?T?(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?/i);
  if (!match) return str;
  const days = match[1] ? `${match[1]}d ` : '';
  const hours = match[2] ? `${match[2]} hr ` : '';
  const mins = match[3] ? `${match[3]} mins` : '';
  const res = (days + hours + mins).trim();
  return res || str;
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
        const trimmed = step.trim();
        if (trimmed) list.push(trimmed);
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

function findRecipesInLdJson(obj) {
  const results = [];
  function traverse(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }
    const type = node['@type'];
    const isRecipe = (typeof type === 'string' && type.toLowerCase().includes('recipe')) ||
      (Array.isArray(type) && type.some(t => typeof t === 'string' && t.toLowerCase().includes('recipe')));
    if (isRecipe && (node.name || node.recipeIngredient || node.recipeInstructions)) {
      results.push(node);
    }
    for (const key of Object.keys(node)) {
      if (key !== '@context' && typeof node[key] === 'object') {
        traverse(node[key]);
      }
    }
  }
  traverse(obj);
  return results;
}

function cleanHtmlForAI(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);
}

// --- /api/recipes/parse-url (Ad-free recipe extractor via JSON-LD with Gemini fallback) ---
app.post('/api/recipes/parse-url', async (c) => {
  const isAllowed = await checkRateLimit(c);
  if (!isAllowed) return c.json({ error: "Sandbox rate limit exceeded (5 requests/day)." }, 429);

  let url;
  try {
    const body = await c.req.json();
    url = body.url;
  } catch (e) {
    return c.json({ error: "Invalid JSON payload." }, 400);
  }

  let targetUrl;
  try {
    targetUrl = new URL(url);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return c.json({ error: "Only http and https protocols are allowed." }, 400);
    }
    const host = targetUrl.hostname.toLowerCase();
    // Guard against SSRF, internal network scanning, and private hosts
    if (
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return c.json({ error: "Access to private or local network resources is forbidden." }, 403);
    }
  } catch (err) {
    return c.json({ error: "A valid http/https recipe URL is required." }, 400);
  }

  const cacheKey = `url:${url}`;
  const cached = await getCachedResponse(c, cacheKey);
  if (cached) {
    try {
      return c.json(JSON.parse(cached));
    } catch (e) {
      return new Response(cached, { headers: { 'Content-Type': 'application/json' } });
    }
  }

  let html;
  try {
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (!pageRes.ok) {
      return c.json({ error: `Unable to access recipe webpage (HTTP ${pageRes.status}).` }, 400);
    }
    html = await pageRes.text();
  } catch (err) {
    return c.json({ error: `Network error retrieving recipe URL: ${err.message}` }, 400);
  }

  // 1. Attempt extraction from Schema.org Recipe JSON-LD
  const ldJsonMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const foundRecipes = [];

  for (const match of ldJsonMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      const extracted = findRecipesInLdJson(parsed);
      foundRecipes.push(...extracted);
    } catch (e) {
      // Ignore malformed JSON-LD scripts
    }
  }

  if (foundRecipes.length > 0) {
    const r = foundRecipes[0];
    const ingredients = Array.isArray(r.recipeIngredient) 
      ? r.recipeIngredient.map(i => typeof i === 'string' ? i.trim() : '').filter(Boolean)
      : [];
    const instructions = extractInstructions(r.recipeInstructions);

    if (ingredients.length > 0 || instructions.length > 0) {
      const cleanRecipe = [{
        title: r.name || r.headline || "Saved Web Recipe",
        prepTime: formatIsoDuration(r.prepTime) || "15 mins",
        cookTime: formatIsoDuration(r.cookTime) || "30 mins",
        cookingTemp: "350°F",
        seasoningProfile: [r.recipeCuisine, r.recipeCategory].flat().filter(Boolean).join(', ') || "Standard",
        ingredients: ingredients.length > 0 ? ingredients : ["See instructions"],
        instructions: instructions.length > 0 ? instructions : ["Follow steps on original website."],
        scalingNote: r.recipeYield ? (Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield).toString() : "Serves 4",
        chefTip: r.description ? (typeof r.description === 'string' ? r.description.slice(0, 200) : "Clipped from web.") : "Clipped from " + new URL(url).hostname,
        imageUrl: extractImage(r.image),
        sourceUrl: url
      }];

      await setCachedResponse(c, cacheKey, JSON.stringify(cleanRecipe));
      return c.json(cleanRecipe);
    }
  }

  // 2. Fallback: Strip ads & markup, invoke Gemini 3.8 Flash to extract structured recipe
  const cleanBodyText = cleanHtmlForAI(html);
  if (cleanBodyText.length < 50) {
    return c.json({ error: "Could not find recipe content on this page." }, 400);
  }

  const prompt = `You are a culinary web scraper. Extract the recipe from this cleaned webpage text into a standardized JSON array. Strip all ads, affiliate text, introductions, and life stories.
Source URL: ${url}
Schema:
[
  {
    "title": "Recipe Title",
    "prepTime": "15 mins",
    "cookTime": "30 mins",
    "cookingTemp": "350°F",
    "seasoningProfile": "Cuisine or Flavor notes",
    "ingredients": ["Item 1", "Item 2"],
    "instructions": ["Step 1", "Step 2"],
    "scalingNote": "Serves 4",
    "chefTip": "Culinary tip, key technique, or substitution",
    "sourceUrl": "${url}"
  }
]
Page Content:
${cleanBodyText}`;

  const model = c.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${c.env.GEMINI_API_KEY}`;

  try {
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    const data = await response.json();
    if (data.error) return c.json({ error: data.error }, 400);
    if (!data.candidates || data.candidates.length === 0) {
      return c.json({ error: { message: "AI recipe extraction returned empty." } }, 400);
    }

    const cleanText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    await setCachedResponse(c, cacheKey, cleanText);
    return new Response(cleanText, { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return c.json({ error: `AI extraction failed: ${err.message}` }, 500);
  }
});

export default app;