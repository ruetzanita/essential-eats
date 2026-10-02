import { describe, it, expect } from "vitest";
import app from "../src/index.js";

describe("Essential Eats Worker API Endpoints", () => {
    it("GET / returns online health check and service metadata", async () => {
        const res = await app.request("http://localhost/");
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.status).toBe("online");
        expect(data.service).toContain("Essential Eats API");
        expect(data.version).toBe("2026.09.27-C");
        expect(data.build).toBe("2026.10.02-A");
        expect(Array.isArray(data.endpoints)).toBe(true);
        expect(data.endpoints.some(e => e.path === "/api/recipes/parse-url")).toBe(true);
    });

    it("GET /api returns service metadata with CORS header", async () => {
        const res = await app.request("http://localhost/api");
        expect(res.status).toBe(200);
        expect(res.headers.get("access-control-allow-origin")).toBe("*");
        const data = await res.json();
        expect(data.status).toBe("online");
    });

    it("GET /api/grocery/parse informs user to use POST", async () => {
        const res = await app.request("http://localhost/api/grocery/parse");
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Use POST to submit receipt data");
    });

    it("POST /api/grocery/parse returns 400 when body lacks text or image", async () => {
        const mockEnv = {
            essential_eats_db: null,
            GEMINI_API_KEY: "test-key"
        };
        const res = await app.request("http://localhost/api/grocery/parse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        }, mockEnv);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain("Missing receipt text or image payload");
    });

    it("POST /api/recipes/import returns 400 when body lacks rawText", async () => {
        const mockEnv = {
            essential_eats_db: null,
            GEMINI_API_KEY: "test-key"
        };
        const res = await app.request("http://localhost/api/recipes/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        }, mockEnv);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain("Missing recipe text");
    });

    it("POST /api/recipes/parse-url returns 400 when body lacks valid url", async () => {
        const mockEnv = {
            essential_eats_db: null,
            GEMINI_API_KEY: "test-key"
        };
        const res = await app.request("http://localhost/api/recipes/parse-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: "not-a-url" })
        }, mockEnv);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain("A valid http/https recipe URL is required");
    });
});
