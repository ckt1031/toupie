import { AutoRouter, cors, json } from "itty-router";
import { handleAuth } from "./auth";
import { relayLLMRequest } from "./routes/completions";
import { handleModelListRequest } from "./routes/models";
import { handleProxy, proxyList } from "./routes/proxy";

const { preflight, corsify } = cors();

const router = AutoRouter({
	before: [preflight],
	finally: [corsify],
});

for (const proxy of proxyList) {
	router.all(`${proxy.path}/*`, (request) => {
		return handleProxy(request, proxy.path, proxy.host);
	});
}

router.get("/v1/models", handleAuth, handleModelListRequest);

// Embeddings for text classification, similarity, etc.
router.post("/v1/embeddings", handleAuth, relayLLMRequest);

// Language models
router.post("/v1/chat/completions", handleAuth, relayLLMRequest);

// Audio models
router.post("/v1/audio/translations", handleAuth, relayLLMRequest);
router.post("/v1/audio/transcriptions", handleAuth, relayLLMRequest);

// Rerank
router.post("/v1/rerank", handleAuth, relayLLMRequest);

// Fallback route
router.get("/", () => json({ message: "OK" }));

export default router;
