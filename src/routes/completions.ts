import { error } from "itty-router";
import type { AuthenticatedRequest } from "../auth";
import {
	type BodyType,
	bodyToBodyInit,
	getValueFromBody,
	modifyBodyWithStringValue,
	proxiedFetch,
	removeFieldsFromBody,
} from "../utils/api-utils";
import pickHeaders from "../utils/pick-headers";
import { pickModelChannelWithFallback } from "../utils/pick-model";

export async function relayLLMRequest(request: AuthenticatedRequest) {
	const contentType = request.headers.get("content-type");
	const isBodyForm = contentType?.includes("multipart/form-data") ?? false;

	// Only /v1/audio/* can be form data
	if (isBodyForm && !request.url.includes("/v1/audio/")) {
		return error(400, "Form data is not allowed for this endpoint");
	}

	const body: BodyType = isBodyForm
		? await request.formData()
		: await request.json();
	const model: string | undefined = await getValueFromBody(body, "model");

	// Model is required
	if (!model) return error(400, "Model is required");

	// Get user key data from request object (set by handleAuth middleware)
	const userKey = request.userKey;

	// Check model allowlist for this user key, if present
	if (userKey?.allowedModels) {
		if (userKey.allowedModels.length === 0) {
			return error(403, "No models are allowed for this API key");
		}
		if (!userKey.allowedModels.includes(model)) {
			return error(403, `Model ${model} is not allowed for this API key`);
		}
	}

	// We can start logic with retries
	let attempts = 0;

	const failedKeys: string[] = [];
	const failedProviders: string[] = [];
	const maxAttempts = 3; // Maximum number of retry attempts

	const headers = pickHeaders(request.headers, [
		"content-type",
		"Authorization",
		isBodyForm ? undefined : "content-type",
	]);

	const originalServerOrigin = new URL(request.url).origin;

	while (attempts < maxAttempts) {
		attempts++;

		const channel = pickModelChannelWithFallback(
			model,
			failedKeys,
			failedProviders,
			userKey,
		);

		// If we don't have a channel, we will return an error, because this is unexpected
		if (!channel) {
			// Check if it's because no providers are allowed for this user key
			if (userKey?.allowedProviders && userKey.allowedProviders.length === 0) {
				return error(403, "No providers are allowed for this API key");
			}

			return error(404, `Model ${model} not found`);
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

		// Handle Azure provider
		if (channel.provider.isAzure) {
			url = request.url.replace(
				`${originalServerOrigin}/v1`,
				`${channel.provider.baseURL}/openai/deployments/${channel.provider.model}`,
			);
			url += `?api-version=${channel.provider.azureAPIVersion}`;

			headers.set("api-key", channel.apiKey.value);
		} else {
			url = request.url.replace(
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
				method: request.method,
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

	return error(500, "All attempts failed. Please try again later.");
}
