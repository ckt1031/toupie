export const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "*",
	"Access-Control-Allow-Headers": "*",
};

export function handleOPTIONS() {
	return new Response(null, {
		headers: corsHeaders,
	});
}

export function setResponseCORSHeaders(response: Response) {
	for (const [key, value] of Object.entries(corsHeaders)) {
		response.headers.set(key, value);
	}

	return response;
}
