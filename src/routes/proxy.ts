import type { IRequest } from "itty-router";
import { proxiedFetch } from "../utils/api-utils";

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
	proxyPath: string,
	proxyHost: string,
) => {
	// Original: https://api.example.com/proxy/openai/v1/chat/completions
	// Proxied: https://api.openai.com/v1/chat/completions
	const originalServerOrigin = new URL(request.url).origin;
	const url = request.url.replace(
		`${originalServerOrigin}${proxyPath}`,
		`https://${proxyHost}`,
	);

	const headers = new Headers(request.headers);
	headers.delete("cf-connecting-ip"); // Remove the Cloudflare connecting IP header
	headers.delete("host"); // Remove the host header to avoid DNS resolution errors

	const response = await proxiedFetch(url, {
		headers,
		method: request.method,
		body: request.body,
		// @ts-ignore
		duplex: "half",
	});

	return response;
};
