import { handleAuth } from "./auth";
import { handleOPTIONS, setResponseCORSHeaders } from "./headers";
import { handleModelListRequest } from "./models";
import { handleProxy, proxyList } from "./proxy";
import { relayLLMRequest } from "./relay";

export default {
	async fetch(request: Request) {
		// Handle OPTIONS requests to allow CORS
		if (request.method === "OPTIONS") {
			return handleOPTIONS();
		}

		// Get URL path
		const path = new URL(request.url).pathname;

		// Handle / endpoint
		if (path === "/") {
			const body = {
				message: "Welcome to the LLM API",
			};

			return Response.json(body);
		}

		// Proxy requests
		for (const proxy of proxyList) {
			if (path.startsWith(proxy.path)) {
				return handleProxy(request, proxy.path, proxy.host);
			}
		}

		// API key protected routes
		if (path.startsWith("/v1")) {
			const isAuthenticated = handleAuth(request);

			if (!isAuthenticated) {
				const errorBody = {
					error: {
						message: "Invalid API key",
						type: "invalid_api_key",
						param: null,
						code: null,
					},
				};

				return Response.json(errorBody, { status: 401 });
			}

			if (path === "/v1/models" && request.method === "GET") {
				return handleModelListRequest();
			}

			if (path === "/v1/chat/completions" && request.method === "POST") {
				return relayLLMRequest(request);
			}

			if (path === "/v1/embeddings" && request.method === "POST") {
				return relayLLMRequest(request);
			}

			if (path === "/v1/audio/transcriptions" && request.method === "POST") {
				return relayLLMRequest(request);
			}

			if (path === "/v1/audio/translations" && request.method === "POST") {
				return relayLLMRequest(request);
			}
		}

		const errorBody = {
			error: {
				message: "Not Found",
				type: "invalid_request_error",
				param: null,
				code: null,
			},
		};

		console.error("No matching route found");

		// Return 404 for all other requests
		return Response.json(errorBody, { status: 404 });
	},
};
