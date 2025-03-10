import { error } from "itty-router";
import { pickModelChannel } from "../pick-model";
import { pickHeaders } from "../utils";

type BodyType = FormData | Record<string, string>;

async function getValueFromBody(body: BodyType, key: string) {
	if (body instanceof FormData) return body.get(key) as string;
	return body[key];
}

async function modifyBodyWithStringValue(
	body: BodyType,
	name: string,
	value: string,
): Promise<BodyInit> {
	if (body instanceof FormData) {
		body.set(name, value);
		return body;
	}

	body[name] = value;
	return JSON.stringify(body);
}

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

	try {
		const response = await fetch(url, {
			headers,
			method: request.method,
			body: newBody,
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
}
