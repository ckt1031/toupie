import type { BlankInput, H } from "hono/types";
import {
	type BodyType,
	bodyToBodyInit,
	getValueFromBody,
	modifyBodyWithStringValue,
	proxiedFetch,
	removeFieldsFromBody,
} from "../../utils/api-utils";
import pickHeaders from "../../utils/pick-headers";
import { pickModelChannelWithFallback } from "../../utils/pick-model";
import type { V1Env } from "./types";

type RequestHandler = H<V1Env, "/v1/chat/completions", BlankInput, Response>;

export const relayLLMRequest: RequestHandler = async (c) => {
	const contentType = c.req.header("content-type");
	const isBodyForm = contentType?.includes("multipart/form-data") ?? false;

	// Only /v1/audio/* endpoints accept multipart form data to align with OpenAI API semantics
	if (isBodyForm && !c.req.url.includes("/v1/audio/")) {
		return c.json({ error: "Form data is not allowed for this endpoint" }, 400);
	}

	const body: BodyType = isBodyForm
		? await c.req.formData()
		: await c.req.json();
	const model: string | undefined = await getValueFromBody(body, "model");

	// Model is required in OpenAI-compatible APIs
	if (!model || !model.trim())
		return c.json({ error: "Model is required" }, 400);

	// Get user key data from request object (set by handleAuth middleware)
	const userKey = c.get("userKey");

	if (!userKey) return c.json({ error: "Unauthorized" }, 401);

	// Enforce model allowlist on the user key, if configured
	if (userKey.allowedModels) {
		if (userKey.allowedModels.length === 0) {
			return c.json({ error: "No models are allowed for this API key" }, 403);
		}
		if (!userKey.allowedModels.includes(model)) {
			return c.json(
				{ error: `Model ${model} is not allowed for this API key` },
				403,
			);
		}
	}

	// Retry loop: attempt across multiple provider keys/providers when failures occur
	let attempts = 0;

	const failedKeys: string[] = [];
	const failedProviders: string[] = [];
	const maxAttempts = 3; // Maximum number of retry attempts

	const headers = pickHeaders(c.req.header(), [
		"content-type",
		"Authorization",
		isBodyForm ? undefined : "content-type",
	]);

	const originalServerOrigin = new URL(c.req.url).origin;

	while (attempts < maxAttempts) {
		attempts++;

		const channel = pickModelChannelWithFallback(
			model,
			userKey,
			failedKeys,
			failedProviders,
		);

		// No available channel after filtering/selection
		if (!channel) {
			// Explicitly handle "no providers allowed" case for clarity
			if (userKey?.allowedProviders && userKey.allowedProviders.length === 0) {
				return c.json(
					{ error: "No providers are allowed for this API key" },
					403,
				);
			}

			return c.json({ error: `Model ${model} not found` }, 404);
		}

		let newBodyObject = modifyBodyWithStringValue(
			body,
			"model",
			channel.provider.model,
		);

		if (channel.provider.model.includes("gemini")) {
			// Gemini models require frequency_penalty to be removed
			newBodyObject = removeFieldsFromBody(newBodyObject, [
				"frequency_penalty",
			]);
		}

		let url: string;

		// Construct URL and headers per provider type (Azure vs. standard OpenAI-compatible)
		if (channel.provider.isAzure) {
			url = c.req.url.replace(
				`${originalServerOrigin}/v1`,
				`${channel.provider.baseURL}/openai/deployments/${channel.provider.model}`,
			);
			url += `?api-version=${channel.provider.azureAPIVersion}`;

			headers.set("api-key", channel.apiKey.value);
		} else {
			url = c.req.url.replace(
				`${originalServerOrigin}/v1`,
				channel.provider.baseURL,
			);

			headers.set("Authorization", `Bearer ${channel.apiKey.value}`);
		}

		let modelUsageMetaData = `Model: ${channel.provider.model}, Provider: ${channel.provider.name} (Key #${channel.apiKey.index})`;

		if (attempts > 1) {
			modelUsageMetaData = `[${attempts}/${maxAttempts}] ${modelUsageMetaData}`;
		}

		// Log to console to monitor model usage
		console.log(modelUsageMetaData);

		try {
			const response = await proxiedFetch(url, {
				headers,
				method: c.req.method,
				body: bodyToBodyInit(newBodyObject),
			});

			if (response.ok && response.status === 200) {
				return response;
			}

			// If we get a 429 (rate limit) or 401/403 (auth error), mark this attempt as failed
			if ([401, 403, 429, 400, 400, 500].includes(response.status)) {
				failedKeys.push(channel.apiKey.value);

				// For certain errors, also mark the provider as failed to move to next provider
				if ([401, 403, 500].includes(response.status)) {
					failedProviders.push(channel.provider.name);
				}
			}

			throw new Error(`Request failed with status ${response.status}`);
		} catch (error) {
			console.error(`Attempt ${attempts} failed:`, error);

			// For network errors or other failures, mark the provider as failed
			failedProviders.push(channel.provider.name);
		}

		// Add current key to failed keys
		failedKeys.push(channel.apiKey.value);
	}

	return c.json({ error: "All attempts failed. Please try again later." }, 500);
};
