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
];

export const handleProxy = async (
	request: Request,
	path: string,
	host: string,
) => {
	const re = new RegExp(`^https?://.*${path}`);
	const url = request.url.replace(re, `https://${host}`);

	const headers = new Headers(request.headers);
	// Remove the host header to prevent DNS issue
	headers.delete("host");

	const modifiedRequest = new Request(url, {
		headers,
		method: request.method,
		body: request.body,
		redirect: "follow",
	});

	const response = await fetch(modifiedRequest);

	if (response.status === 404) {
		console.error("Proxy request failed with 404");

		const errorBody = {
			error: {
				message: "Not Found",
				type: "invalid_request_error",
				param: null,
				code: null,
			},
		};

		return new Response(JSON.stringify(errorBody), { status: 404 });
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});
};
