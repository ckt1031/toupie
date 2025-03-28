import { error } from "itty-router";
import {
	type BodyType,
	bodyToBodyInit,
	getValueFromBody,
	modifyBodyWithStringValue,
	proxiedFetch,
	removeFieldsFromBody,
} from "../utils/api-utils";
import pickHeaders from "../utils/pick-headers";
import { pickModelChannel } from "../utils/pick-model";

export async function relayLLMRequest(request: Request) {
	const contentType = request.headers.get("content-type");
	const isBodyForm = contentType?.includes("multipart/form-data") ?? false;

	// Only /v1/audio/* can be form data
	if (isBodyForm && !request.url.startsWith("/v1/audio/")) {
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

	const channel = pickModelChannel(model);

	if (!channel) {
		const erorrMessage = `Model ${model} not found`;
		console.error(erorrMessage);
		return error(404, erorrMessage);
	}

	// Replace the baseURL with the provider's baseURL
	let url: string;

	const headers = pickHeaders(request.headers, [
		"content-type",
		"Authorization",
	]);

	// We will remove from body content-type if it's a form data
	if (isBodyForm) {
		headers.delete("content-type");
	}

	// Handle Azure provider
	const originalServerOrigin = new URL(request.url).origin;

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
		`Model: ${channel.provider.model}, Provider: ${channel.provider.name} (Key #${channel.apiKey.index})`,
	);

	// Replace request.body model with the model id as we need to cast models
	let newBodyObject = modifyBodyWithStringValue(
		body,
		"model",
		channel.provider.model,
	);

	// Detect if the model has gemini name
	const geminiModel = channel.provider.model.includes("gemini");

	// Remove fields from body
	if (geminiModel) {
		newBodyObject = removeFieldsFromBody(newBodyObject, ["frequency_penalty"]);
	}

	const response = await proxiedFetch(url, {
		headers,
		method: request.method,
		body: bodyToBodyInit(newBodyObject),
		// @ts-ignore
		duplex: "half",
	});

	return response;
}
