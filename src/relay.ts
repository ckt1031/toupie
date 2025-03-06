import { setResponseCORSHeaders } from "./headers";
import { pickModelChannel } from "./models";

export async function relayLLMRequest(request: Request) {
	const body = await request.clone().json();

	const model: string | undefined = body.model;

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
	body.model = channel.provider.model;

	// Replace the baseURL with the provider's baseURL
	let url: string;

	const headers = new Headers(request.headers);
	// remove host header to prevent DNS issue
	headers.delete("host");

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

	// Add extra meta information to trace the requests
	headers.set("X-Provider", channel.provider.name);
	headers.set("X-Key-Index", channel.apiKey.index.toString());

	// Print details to console
	console.info(
		`Model: ${body.model}, Provider: ${channel.provider.name} (Key #${channel.apiKey.index})`,
	);

	const modifiedRequest = new Request(url, {
		headers,
		method: request.method,
		body: JSON.stringify(body),
		redirect: "follow",
	});

	const response = await fetch(modifiedRequest);
	const modifiedResponse = new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});

	return setResponseCORSHeaders(modifiedResponse);
}
