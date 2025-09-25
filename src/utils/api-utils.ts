export type BodyType = FormData | Record<string, string>;

export async function getValueFromBody(body: BodyType, key: string) {
	if (body instanceof FormData) return body.get(key) as string;
	return body[key];
}

export function modifyBodyWithStringValue(
	body: BodyType,
	name: string,
	value: string,
): BodyType {
	if (body instanceof FormData) {
		body.set(name, value);
		return body;
	}

	body[name] = value;

	return body;
}

export function removeFieldsFromBody(
	body: BodyType,
	fields: string[],
): BodyType {
	// Remove fields from FormData
	if (body instanceof FormData) {
		for (const field of fields) {
			body.delete(field);
		}
		return body;
	}

	for (const field of fields) {
		delete body[field];
	}

	return body;
}

export function bodyToBodyInit(body: BodyType): BodyInit {
	if (body instanceof FormData) return body;
	return JSON.stringify(body);
}

// Clean up headers before reaching to client (response)
export function purgeHeaders(headers: Headers): Headers {
	// Clone the headers
	const clonedHeaders = new Headers(headers);

	// Delete server header
	clonedHeaders.delete("server");

	// Clean up x-* headers
	for (const key of clonedHeaders.keys()) {
		if (key.startsWith("x-")) {
			clonedHeaders.delete(key);
		}
	}

	return clonedHeaders;
}

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
			headers: purgeHeaders(response.headers),
		});
	} catch (err) {
		const isErrorValid = err instanceof Error;

		if (isErrorValid) {
			// If cause is a Response, log the response body
			if (err.cause instanceof Response) {
				const response = err.cause;

				// Return JSON data if available
				// Check if response is JSON
				if (
					response.headers.get("content-type")?.includes("application/json")
				) {
					const json = await response.json();

					// Log the JSON data
					console.error("Response:", json);

					throw new Error(
						`Proxy request failed with status ${response.status}`,
						{
							cause: json,
						},
					);
				}

				const text = await response.text();

				// Log the text data
				console.error("Response:", text);

				throw new Error(`Proxy request failed with status ${response.status}`, {
					cause: text,
				});
			}

			// Log the error
			console.error(err.message);

			// If cause is not a Response, return the error message
			throw new Error(`Proxy request failed`, {
				cause: err.message,
			});
		}

		// Log the error
		console.error(err);

		// If error is not an instance of Error, return generic error
		throw new Error(`Proxy request failed with unknown error`, {
			cause: "Internal Server Error",
		});
	}
}
