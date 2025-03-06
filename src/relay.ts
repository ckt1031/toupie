import { setResponseCORSHeaders } from "./headers";
import { pickModelChannel } from "./models";

function isBodyFormDataType(req: Request): boolean {
	const contentType = req.headers.get("content-type");

	if (!contentType) return false;

	return contentType.includes("multipart/form-data");
}

async function getValueFromBody(req: Request, key: string) {
	const clonedRequest = req.clone();
	const isBodyForm = isBodyFormDataType(req);

	if (isBodyForm) {
		const body = await clonedRequest.formData();
		return body.get(key);
	}

	const body = await clonedRequest.json();

	return body[key];
}

async function modifyBodyWithStringValue(
	req: Request,
	name: string,
	value: string,
): Promise<BodyInit> {
	const clonedRequest = req.clone();
	const isBodyForm = isBodyFormDataType(req);

	if (isBodyForm) {
		const body = await clonedRequest.formData();
		body.set(name, value);

		return body;
	}

	const body: Record<string, string> = await clonedRequest.json();

	body[name] = value;

	return JSON.stringify(body);
}

export async function relayLLMRequest(request: Request) {
	const model: string | undefined = await getValueFromBody(request, "model");

	if (!model) {
		const erorrMessage = "Model is required";
		console.error(erorrMessage);
		return new Response(erorrMessage, { status: 400 });
	}

	const channel = pickModelChannel(model);

	if (!channel) {
		const erorrMessage = `Model ${model} not found`;
		console.error(erorrMessage);
		return new Response(erorrMessage, { status: 404 });
	}

	// Replace request.body model with the model id as we need to cast models
	const newBody = await modifyBodyWithStringValue(
		request,
		"model",
		channel.provider.model,
	);

	// Replace the baseURL with the provider's baseURL
	let url: string;

	const headers = new Headers(request.headers);
	// remove host header to prevent DNS issue
	headers.delete("host");

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
	console.info(
		`Model: ${channel.provider.model}, Provider: ${channel.provider.name} (Key #${channel.apiKey.index})`,
	);

	// Request to the provider
	const modifiedRequest = new Request(url, {
		headers,
		method: request.method,
		body: newBody,
		redirect: "follow",
	});

	const response = await fetch(modifiedRequest);
	const modifiedResponse = new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});

	// Add extra meta information to trace the requests
	modifiedResponse.headers.set("X-Provider", channel.provider.name);
	modifiedResponse.headers.set("X-Key-Index", channel.apiKey.index.toString());

	return setResponseCORSHeaders(modifiedResponse);
}
