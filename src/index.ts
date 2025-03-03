import { handleAuth } from "./auth";
import { handleModelListRequest } from "./models";
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

		// Handle /proxy/google-genai
		if (path.startsWith("/proxy/google-genai")) {
			return handleProxy(
				request,
				"/proxy/google-genai",
				"generativelanguage.googleapis.com",
			);
		}

		if (path.startsWith("/proxy/openai")) {
			return handleProxy(request, "/proxy/openai", "api.openai.com");
		}

		if (path.startsWith("/proxy/anthropic")) {
			return handleProxy(request, "/proxy/anthropic", "api.anthropic.com");
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
		}

		const errorBody = {
			error: {
				message: "Not Found",
				type: "invalid_request_error",
				param: null,
				code: null,
			},
		};

		// Return 404 for all other requests
		return Response.json(errorBody, { status: 404 });
	},
};

const handleProxy = async (request: Request, path: string, host: string) => {
	const url = new URL(request.url);
	// Replace with the official host
	url.port = ""; // Remove port number in local environment
	url.protocol = "https:"; // Use HTTPS in local environment
	url.host = host;
	url.pathname = url.pathname.replace(path, "");

	const modifiedRequest = new Request(url.toString(), {
		headers: request.headers,
		method: request.method,
		body: request.body,
		redirect: "follow",
	});

	const response = await fetch(modifiedRequest);
	const modifiedResponse = new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});

	// Add CORS headers
	modifiedResponse.headers.set("Access-Control-Allow-Origin", "*");
	modifiedResponse.headers.set("Access-Control-Allow-Methods", "*");
	modifiedResponse.headers.set("Access-Control-Allow-Headers", "*");

	return modifiedResponse;
};

const handleOPTIONS = async () => {
	return new Response(null, {
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "*",
			"Access-Control-Allow-Headers": "*",
		},
	});
};
