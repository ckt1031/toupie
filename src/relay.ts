import { pickModelChannel } from "./models";

export async function relayLLMRequest(request: Request) {
    const body = await request.clone().json();

    const model: string | undefined = body.model;

    if (!model) {
        return new Response("Model is required", { status: 400 });
    }

    const channel = pickModelChannel(model);

    if (!channel) {
        return new Response("Model not found", { status: 404 });
    }

    // Replace request.body model with the model id
    body.model = channel.provider.model;

    // Replace the baseURL with the provider's baseURL
    const url = request.url.replace(/^https?:.*\/v1/, channel.provider.baseURL);

    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${channel.key}`);

    console.info(`Provider: ${channel.provider.name}, URL: ${url}`);
    console.info(`Requested Model: ${body.model}`);

    const modifiedRequest = new Request(url, {
        headers,
        method: request.method,
        body: JSON.stringify(body),
        redirect: 'follow'
    });

    const response = await fetch(modifiedRequest);
    const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
    });

    // Add CORS headers
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    modifiedResponse.headers.set('Access-Control-Allow-Methods', '*');
    modifiedResponse.headers.set('Access-Control-Allow-Headers', '*');

    return modifiedResponse;
}