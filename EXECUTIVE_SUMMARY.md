# Executive Summary: Essential Eats
 
**Role/Focus:** Full-Stack Engineer, Applied AI, Cloudflare Edge Computing  
**Live Portfolio Demo:** [essentialeats.ruetzanita.com](https://essentialeats.ruetzanita.com)  
**Current Build:** `2026.10.02-A` • **API Protocol:** `2026.09.27-C`  

## The Problem
Meal planning apps are often rigid, requiring manual entry of every grocery item and forcing users to buy new ingredients for recipes. I built **Essential Eats** to reverse this paradigm: it looks at what you *already* have in your pantry and uses AI to generate high-quality, chef-level meals, eliminating food waste, cognitive load, and mental overhead.

---

## Core Technical Achievements

### 1. Applied AI & Multimodal Prompt Engineering
Instead of using AI as a simple chatbot, I integrated it deeply into the application's core data pipelines using **Google Gemini 3.8 Flash**.
- **Multimodal & Context-Aware Receipt Ingestion:** An engineered ingestion pipeline that takes raw receipt text or compressed camera photos and extracts structured JSON. It executes automated **multipack unpacking** (`"12-pack Wet Cat Food"` $\rightarrow$ `quantity: 12`, `"1 Dozen Eggs"` $\rightarrow$ `12`), strips noisy brand names into clean ingredients, and aligns categories against an existing pantry reference snapshot.
- **Recipe Importer & Web Clipper (`/api/recipes/parse-url`):** An intelligent pipeline that accepts raw text or direct recipe URLs. It parses Schema.org `Recipe` JSON-LD with zero-token efficiency, with an automated fallback to Gemini 3.8 Flash to strip 100% of website advertisements, sponsored clutter, and blog preambles into clean JSON.
- **Nourishing Supper Constraint Solver:** Dynamically queries available inventory, selecting protein/fresh anchors (`Fresh`, `Frozen Foods`, `Meat`) to build complete meals around. The engine deterministically enforces strict dietary guardrails (Gluten-Free, Dairy-Free, Nut-Free, Vegetarian, Vegan, Keto) alongside dynamic user checkboxes, while generating inspiring `chefTip` (Nourish Note) guidance (1-2 sentences on making the dish special, mind/body nourishment, and versatile future swaps).

### 2. Edge Computing Architecture & Modern UI Innovations
To ensure global sub-second latency, the backend is built completely serverless at the Cloudflare edge:
- **Manifest V3 Chrome Extension ("Essential Eats Recipe Clipper"):** An ad-free 1-tap browser web clipper with glassmorphic preview, automatic dietary tag analysis (GF, DF, Nut-Free, Vegan), checklist view, and real-time cross-tab synchronization.
- **Mobile In-App URL Ingestion & 1-Tap Bookmarklet:** Solves mobile browser extension limits by providing a direct "Clip Recipe from URL" in-app portal and one-tap JavaScript bookmarklet for iOS Safari and Android Chrome.
- **Cloudflare Workers & Hono:** Edge API routes deployed globally to handle requests close to the user with minimal cold starts.
- **Dedicated "OUT OF STOCK" Auto-Sorting:** Inventory items with `quantity <= 0` are segregated into an out-of-stock category with department badges, restock controls, and a live floating dock warning counter with 1-tap smooth scrolling.
- **Aisle-Categorized Grocery Export & Web Share:** Converts shopping lists into department-grouped checklists (`🥬 PRODUCE`, `🥩 MEAT`, `🥛 BEVERAGES`, `🥫 PANTRY`) and leverages the **Web Share API** (`navigator.share`) for 1-tap export to Google Keep, Apple Notes, Messages, or WhatsApp.
- **Smart Grocery Auto-Deduction:** Committing staged groceries automatically scans and crosses off purchased items from the user's shopping list.
- **Glassmorphic Toast Engine:** Replaced disruptive browser `alert()` dialogs with CSS-animated non-blocking glassmorphic toasts.
- **Immersive Onboarding & Storytelling Splash Experience:** Welcomes visitors with empathetic storytelling addressing dinner fatigue, balanced typography (`text-wrap: balance`), interactive capability pillars, creator contact channels (`hello@ruetzanita.com`), and persistent header re-invocation.


### 3. Decoupled Sandbox Firewall Engineering
To allow recruiters, engineers, and public visitors to test the full application without exposing private personal pantry data or risking unbounded API costs:
- **Client-Side Data Shard (`localStorage`):** Shifts all inventory and recipe mutations client-side (`kh_sandbox_inventory`, `kh_sandbox_recipes`), providing each visitor with an isolated, private database session that never intersects with the production database.
- **Edge IP Rate Limiting:** Cloudflare D1 (`DemoRateLimits`) restricts AI generation calls to 5 requests per day per IP, shedding abusive traffic at edge latency.
- **SHA-256 Edge Prompt Caching:** Identical or common prompts return cached JSON from D1 (`DemoCache`) with zero token spend.
