import { error } from "itty-router";
import { adjustCompletionRequestBody } from "../utils/adjust-request";
import {
	type BodyType,
	bodyToBodyInit,
	getValueFromBody,
	modifyBodyWithStringValue,
	proxiedFetch,
} from "../utils/api-utils";
import pickHeaders from "../utils/pick-headers";
import { pickModelChannel } from "../utils/pick-model";

function getFailedAttemptKey(provider: string, keyIndex: number) {
	return `${provider}:${keyIndex}`;
}

async function tryRequest(
	url: string,
	key: string,
	headers: Headers,
	method: string,
	body: BodyInit,
	provider: string,
	keyIndex: number,
	failedAttempts: Set<string>,
): Promise<Response> {
	try {
		const response = await proxiedFetch(url, {
			headers,
			method,
			body,
			// @ts-ignore
			duplex: "half",
		});

		// If the request was successful, clear the failed attempt
		if (response.ok) {
			failedAttempts.delete(getFailedAttemptKey(provider, keyIndex));
			return response;
		}

		// If we get a 429 (rate limit) or 401/403 (auth error), mark this attempt as failed
		if ([401, 403, 429, 400, 400, 500].includes(response.status)) {
			failedAttempts.add(getFailedAttemptKey(provider, keyIndex));
		}

		throw new Error(`Request failed with status ${response.status}`);
	} catch (error) {
		console.error(`Key: ${key} failed`);
		// Mark this attempt as failed
		failedAttempts.add(getFailedAttemptKey(provider, keyIndex));
		throw error;
	}
}

export async function relayLLMRequest(request: Request) {
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
	if (!model) {
		return error(400, "Model is required");
	}

	const originalServerOrigin = new URL(request.url).origin;
	let lastError: Error | null = null;
	let attempts = 0;
	const maxAttempts = 3; // Maximum number of retry attempts
	const failedAttempts = new Set<string>(); // Per-request failed attempts tracking

	while (attempts < maxAttempts) {
		attempts++;
		const channel = pickModelChannel(model);

		if (!channel) {
			const errorMessage = `Model ${model} not found`;
			console.error(errorMessage);
			return error(404, errorMessage);
		}

		// Skip if this provider/key combination has failed before
		if (
			failedAttempts.has(
				getFailedAttemptKey(channel.provider.name, channel.apiKey.index),
			)
		) {
			continue;
		}

		// Replace the baseURL with the provider's baseURL
		let url: string;
		const baseHeaders = pickHeaders(request.headers, [
			"content-type",
			"Authorization",
		]);

		// Create a new Headers object to modify
		const headers = new Headers(baseHeaders);

		// We will remove from body content-type if it's a form data
		if (isBodyForm) {
			headers.delete("content-type");
		}

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

		// Print details to console
		console.debug(`Request URL: ${url}`);
		console.info(
			`Attempt ${attempts}/${maxAttempts}: Model: ${channel.provider.model}, Provider: ${channel.provider.name} (Key #${channel.apiKey.index})`,
		);

		// Replace request.body model with the model id as we need to cast models
		let newBodyObject = modifyBodyWithStringValue(
			body,
			"model",
			channel.provider.model,
		);

		newBodyObject = adjustCompletionRequestBody(newBodyObject, channel);

		try {
			const response = await tryRequest(
				url,
				channel.apiKey.value,
				headers,
				request.method,
				bodyToBodyInit(newBodyObject),
				channel.provider.name,
				channel.apiKey.index,
				failedAttempts,
			);
			return response;
		} catch (error) {
			lastError = error as Error;
			// console.error(`Attempt ${attempts} failed:`, error);
		}
	}

	// If we've exhausted all attempts, return the last error
	console.error("All attempts failed:", lastError);

	return error(500, "All API attempts failed. Please try again later.");
}
