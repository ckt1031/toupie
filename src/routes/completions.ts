import { error } from "itty-router";
import {
	type BodyType,
	getValueFromBody,
	modifyBodyWithStringValue,
	proxiedFetch,
} from "../utils/api-utils";
import pickHeaders from "../utils/pick-headers";
import { pickModelChannel } from "../utils/pick-model";

export async function relayLLMRequest(request: Request) {
	const contentType = request.headers.get("content-type");
	const isBodyForm = contentType?.includes("multipart/form-data") ?? false;

	const body: BodyType = isBodyForm
		? await request.formData()
		: await request.json();
	const model: string | undefined = await getValueFromBody(body, "model");

	if (!model) {
		const erorrMessage = "Model is required";
		console.error(erorrMessage);
		return error(400, erorrMessage);
	}

	if (typeof body === "object") {
		console.debug("Request body: ", body);
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

	// Handle Azure provider
	if (channel.provider.isAzure) {
		url = request.url.replace(
			/^https?:.*\/v1/,
			`${channel.provider.baseURL}/openai/deployments/${channel.provider.model}`,
		);
		url += `?api-version=${channel.provider.azureAPIVersion}`;

		headers.set("api-key", channel.apiKey.value);
	} else {
		url = request.url.replace(/^https?:.*\/v1/, channel.provider.baseURL);

		headers.set("Authorization", `Bearer ${channel.apiKey.value}`);
	}

	// Print details to console
	console.debug(`Request URL: ${url}`);
	console.info(
		`Model: ${channel.provider.model}, Provider: ${channel.provider.name} (Key #${channel.apiKey.index})`,
	);

	// Replace request.body model with the model id as we need to cast models
	const newBody = await modifyBodyWithStringValue(
		body,
		"model",
		channel.provider.model,
	);

	const response = await proxiedFetch(url, {
		headers,
		method: request.method,
		body: newBody,
		// @ts-ignore
		duplex: "half",
	});

	return response;
}
