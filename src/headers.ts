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
