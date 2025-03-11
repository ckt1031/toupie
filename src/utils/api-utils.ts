import { error } from "itty-router";

export async function proxiedFetch(
	input: RequestInfo,
	init: RequestInit,
): Promise<Response> {
	try {
		const response = await fetch(input, init);

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

			// Itty router error
			return error(500, err.message);
		}

		// Itty router error
		return error(500, "Internal Server Error");
	}
}
