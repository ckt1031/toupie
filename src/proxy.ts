import { rejectErrorResponse } from "./utils";

export const proxyList = [
	{
		path: "/proxy/google-genai",
		host: "generativelanguage.googleapis.com",
	},
	{
		path: "/proxy/openai",
		host: "api.openai.com",
	},
	{
		path: "/proxy/anthropic",
		host: "api.anthropic.com",
	},
	{
		path: "/proxy/groq",
		host: "api.groq.com",
	},
	{
		path: "/proxy/cohere",
		host: "api.cohere.com",
	},
	{
		path: "/proxy/mistral",
		host: "api.mistral.ai",
	},
];

export const handleProxy = async (
	request: Request,
	path: string,
	host: string,
) => {
	const re = new RegExp(`^https?://.*${path}`);
	const url = request.url.replace(re, `https://${host}`);

	const headers = new Headers(request.headers);
	headers.delete("host"); // Remove the host header to avoid DNS resolution errors

	try {
		const response = await fetch(url, {
			headers,
			method: request.method,
			body: request.body,
			// @ts-ignore
			duplex: "half",
		});

		if (response.status !== 200) {
			throw new Error(`Proxy request failed with status ${response.status}`);
		}

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	} catch (error) {
		const isErrorValid = error instanceof Error;

		if (!isErrorValid) {
			// An unknown error occurred
			return rejectErrorResponse(
				500,
				"Unknown Internal Server Error",
				"internal_server_error",
			);
		}

		console.error("Proxy request failed with error", error);

		const errorBody = {
			error: {
				message: "Internal Server Error",
				type: "invalid_request_error",
				param: null,
				code: null,
			},
		};

		return new Response(JSON.stringify(errorBody), { status: 500 });
	}
};
