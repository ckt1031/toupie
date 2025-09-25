import { Hono } from "hono";
import apiConfig from "../../../data/api.json";
import { relayLLMRequest } from "./completions";
import { handleModelListRequest } from "./models";
import type { V1Env } from "./types";
import { etag } from "hono/etag";
import { timeout } from "hono/timeout";

const app = new Hono<V1Env>();

const apiKeyMap = new Map(apiConfig.userKeys.map((item) => [item.key, item]));

// Force max timeout of 300 seconds (5 minutes)
app.use(timeout(300 * 1000));

app.use(async (c, next) => {
    const authorization = c.req.header("Authorization");

    if (!authorization) return c.json({ error: "Missing key" }, 401);
    if (!authorization.startsWith("Bearer "))
        return c.json({ error: "Invalid authorization format" }, 401);

    const keyData = apiKeyMap.get(authorization.replace("Bearer ", ""));

    if (!keyData) return c.json({ error: "Invalid key" }, 401);

    c.set("userKey", keyData);

    await next();
});

app.get("/models", etag(), handleModelListRequest);

// Embeddings for text classification, similarity, etc.
app.post("/embeddings", relayLLMRequest);

// Language models
app.post("/chat/completions", relayLLMRequest);

// Audio models
app.post("/audio/translations", relayLLMRequest);
app.post("/audio/transcriptions", relayLLMRequest);

// Rerank
app.post("/rerank", relayLLMRequest);

export default app;
