import type { Context } from "hono";
import type { BlankEnv, BlankInput } from "hono/types";
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
	{
		path: "/proxy/openrouter",
		host: "openrouter.ai",
	},
];

export const handleProxy = async (
	c: Context<BlankEnv, `${string}/*`, BlankInput>,
	proxyPath: string,
	proxyHost: string,
) => {
	// Original: https://api.example.com/proxy/openai/v1/chat/completions
	// Proxied: https://api.openai.com/v1/chat/completions
	const originalServerOrigin = new URL(c.req.url).origin;
	const url = c.req.url.replace(
		`${originalServerOrigin}${proxyPath}`,
		`https://${proxyHost}`,
	);

	const headers = new Headers(c.req.header());
	headers.delete("cf-connecting-ip"); // Remove the Cloudflare connecting IP header
	headers.delete("host"); // Remove the host header to avoid DNS resolution errors

	const response = await proxiedFetch(url, {
		headers,
		method: c.req.method,
		body: c.req.raw.body,
		// @ts-expect-error
		duplex: "half",
	});

	return response;
};
