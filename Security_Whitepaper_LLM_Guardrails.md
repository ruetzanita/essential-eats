# Security Whitepaper: LLM Guardrails & Infrastructure Hardening
**Protecting Production Environments, API Wallets, and User Health**

---

## Page 1: Preventing LLM Slop via Schema-Enforced JSON Logic Gates

When integrating Large Language Models (LLMs) into production applications, the primary risk is non-deterministic output—often referred to as "LLM slop" or hallucination. If an AI returns unstructured conversational text when the application expects an array of ingredients, the system crashes. When allergen safety is involved, hallucination can be dangerous.

To harden the Essential Eats architecture against this, the system completely bypasses conversational AI paradigms in favor of **Schema-Enforced JSON Logic Gates**.

### The Mechanism of Enforcement

Instead of asking the LLM to "generate a recipe," the API acts as a strict orchestrator:

1.  **Strict Prompt Engineering & System Directives:** The system prompt does not converse. It provides a rigid directive outlining the exact JSON schema required and explicitly forbids conversational filler (e.g., "Here is your recipe!").
2.  **Type-Casting the LLM:** By instructing the Gemini 3.8 Flash API to output strict JSON (`response_mime_type: "application/json"` with an explicit JSON schema), the LLM is constrained at the generation level to format its response as machine-readable data.
3.  **Sanitization and Deduplication:** When parsing noisy data (like OCR receipt text or camera captures), the prompt forces the AI into a categorization and sanitization logic gate:
    *   **Brand Stripping:** "Lays Kettle Chips" $\rightarrow$ "Kettle Chips".
    *   **Multipack Unpacking:** "12-pack Wet Cat Food" $\rightarrow$ `quantity: 12`.
    *   **Context Alignment:** Matches incoming items against the user's pantry snapshot to avoid category fragmentation.
4.  **Deterministic Allergen Matrix Injection:** Every recipe formulation cycle deterministically enforces **5 mandatory baseline guardrails**:
    *   *Gluten-Free* (no wheat, barley, rye, breading, standard soy sauce)
    *   *Dairy-Free* (no butter, milk, cheese, cream, yogurt)
    *   *Chocolate-Free* (no cocoa, cacao, chocolate)
    *   *Sage-Free* (no fresh or dried sage)
    *   *Nut-Free* (no peanuts or tree nuts)
    *   *Dynamic UI Overrides:* Added in conjunction with user selections (e.g. Vegetarian, Vegan, Keto).
5.  **Deterministic Validation & Deep Crawler:** Upon receiving the payload, the Hono backend and client-side deep crawler normalize keys recursively, guaranteeing zero `undefined` values reach presentation state.

This approach transforms the LLM from a volatile conversationalist into a predictable, highly capable data transformation microservice.

---

<div style="page-break-after: always;"></div>

## Page 2: The Sandbox Blueprint

### Isolating Mutations to Firewall Production

A significant challenge in deploying portfolio applications is allowing public interaction—especially for recruiters and hiring managers—without exposing the system to malicious API abuse, database tampering, or exorbitant billing costs. 

To solve this, Essential Eats utilizes a **Decoupled Sandbox Architecture**.

### The Architecture of Isolation

**1. Browser `localStorage` as a Database Shard**
Instead of provisioning unique backend database rows for every public user, the entire data layer for the "Recruiter Demo" is shifted client-side. 
*   When a user accesses the sandbox, their inventory mutations (adding/removing items) are written directly to their browser's `localStorage` (`kh_sandbox_inventory` and `kh_sandbox_recipes`).
*   This grants every user an isolated, pristine database session that persists across reloads but physically cannot intersect with the production Cloudflare D1 database.
*   Private production data (Kitchen Hub) is completely firewalled.

**2. IP-Based Edge Rate Limiting**
While database mutations are handled client-side, requests to the AI engine (e.g., `/api/suggest`) must still hit the Gemini API via the backend. To protect the API wallet:
*   A custom rate limiter is deployed at the Cloudflare Edge, identifying users by their IP address.
*   The system enforces a strict quota (5 AI generation requests per day per IP) recorded in Cloudflare D1 (`DemoRateLimits`).
*   Because this logic executes on the edge before hitting the main worker process, malicious floods are dropped with near-zero latency and cost.

**3. Aggressive SHA-256 Prompt Caching**
To further reduce API calls while maintaining the illusion of infinite generation, the system employs aggressive prompt caching at the edge (`DemoCache`). Frequently tested inventory combinations and standard recipe requests return cached JSON instantly, bypassing the LLM entirely for common sandbox interactions.

This multi-tiered defense strategy ensures the portfolio remains live, interactive, and impressive, while the underlying infrastructure and budget remain completely secure.
