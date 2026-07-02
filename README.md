# Essential Eats 🥗

**Live Demo:** [essentialeats.ruetzanita.com](https://essentialeats.ruetzanita.com)
Essential Eats is an AI-powered smart kitchen inventory and meal suggestion app designed to eliminate food waste and answer the eternal question: *"What's for supper?"*

## 🌌 The Genesis

Essential Eats wasn't born in a vacuum; it was built out of pure operational necessity. As someone navigating AuDHD, the daily executive function required to answer *"What's for supper?"* was already exhausting. Compounding that challenge was my husband’s hyper-restrictive dietary matrix: **strictly zero gluten, zero dairy, zero chocolate, and zero nuts.** 

Standard meal planning apps completely break when hit with that level of constraint—they either suggest unsafe recipes or require hours of manual ingredient cross-checking. I built Essential Eats to offload that cognitive burden entirely, turning a daily logistical headache into a seamless, automated, and safe edge-computing solution.

## Architecture

Essential Eats is built using modern edge-computing and AI integrations:
- **Frontend:** Vanilla JS + Vite for blazing-fast local development and static asset delivery.
- **Backend:** Hono framework running on Cloudflare Workers for edge-distributed latency.
- **Database:** Cloudflare D1 (Serverless SQLite) for the main application, and browser `localStorage` for the recruiter sandbox.
- **AI Engine:** Google Gemini (3.5 Flash) for intelligent unstructured text parsing, structured JSON extraction, and creative recipe generation.

## Features

- **Smart OCR Receipt Parsing:** Paste raw OCR text from a grocery receipt. The backend AI intelligently parses the text, sanitizes brand names into generic ingredients (e.g., "Concord Grape Juice" to "Grape Juice"), deduplicates, and categorizes the items before adding them to your inventory.
- **Recipe Importer:** Paste any block of raw text (from a blog or article), and the API seamlessly extracts and structures it into a recipe object containing titles, ingredients arrays, and step-by-step instructions.
- **Dynamic "Michelin-Chef" Meal Generation:** Acts as an elite chef by dynamically querying your current inventory (seeking out a protein anchor alongside fresh produce/staples) and generates 5 recipes in a rigid JSON format containing prep times, cooking temperatures, detailed seasoning profiles, and custom chef tips.
- **Dietary Restriction Engine:** Dynamically injects dietary constraints (e.g., Gluten-Free, Vegan, Nut-Free) into the AI generation prompt to ensure all suggested recipes are safe to eat.
- **Interactive UI Components:** Features a "Loading Dock" staging area to verify AI parses before committing, and a quick-access Shopping List that automatically crosses off items as you buy them.

## The Recruiter Sandbox

A live, specialized version of this app designed for recruiters is available at [essentialeats.ruetzanita.com](https://essentialeats.ruetzanita.com).
To prevent excessive API billing or database conflicts while allowing full interaction, the sandbox version:
- Uses `localStorage` to give every user an isolated, pristine database session.
- Implements **IP Rate Limiting** (configurable, typically 5 requests/day) backed by Cloudflare D1.
- Implements **Prompt Caching** to instantly return AI responses for frequently tested inventory combinations.
- Use test_reciept if you don't have a grocery receipt lying around to scan and upload.

## Running Locally

### 1. Start the API (Cloudflare Worker)
```bash
cd logic
npm install
npm run dev
```

### 2. Start the Frontend (Vite)
Open a new terminal tab:
```bash
cd interface
npm install
npm run dev
```

## License
Copyright (c) 2026. All Rights Reserved. Not for reuse or distribution.
