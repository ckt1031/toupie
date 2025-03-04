import { handleAuth } from "./auth";
import { handleOPTIONS, setResponseCORSHeaders } from "./headers";
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

		console.error("No matching route found");

		// Return 404 for all other requests
		return Response.json(errorBody, { status: 404 });
	},
};

const handleProxy = async (request: Request, path: string, host: string) => {
	const re = new RegExp(`^https?://.*${path}`);
	const url = request.url.replace(re, `https://${host}`);

	console.info(`Proxying request to ${url}`);

	const headers = new Headers(request.headers);
	// Remove the host header to prevent DNS issue
	headers.delete("host");

	const modifiedRequest = new Request(url, {
		headers,
		method: request.method,
		body: request.body,
		redirect: "follow",
	});

	const response = await fetch(modifiedRequest);

	if (response.status === 404) {
		console.error("Proxy request failed with 404");
		
		const errorBody = {
			error: {
				message: "Not Found",
				type: "invalid_request_error",
				param: null,
				code: null,
			},
		};

		return Response.json(errorBody, { status: 404 });
	}

	const modifiedResponse = new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});

	// Add CORS headers to the response
	return setResponseCORSHeaders(modifiedResponse);
};
