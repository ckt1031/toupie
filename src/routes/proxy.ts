import { type IRequest, error } from "itty-router";

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
	request: IRequest,
	path: string,
	host: string,
) => {
	const re = new RegExp(`^https?://.*${path}`);
	const url = request.url.replace(re, `https://${host}`);

	const headers = new Headers(request.headers);
	headers.delete("cf-connecting-ip"); // Remove the Cloudflare connecting IP header
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
			throw new Error(`Proxy request failed with status ${response.status}`, {
				cause: response,
			});
		}

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	} catch (err) {
		const isErrorValid = err instanceof Error;

		if (isErrorValid) {
			// If cause is a Response, log the response body
			if (err.cause instanceof Response) {
				console.error("Response:", await err.cause.text());
			} else {
				console.error(err);
			}

			return error(500, err.message);
		}

		return error(500, "Internal Server Error");
	}
};
