import apiConfig from "../data/api.json";

/**
 *  Match keys in Authorization header
 */
export function handleAuth(request: Request): boolean {
	const headers = request.headers;
	const authorization = headers.get("Authorization");

	if (!authorization) return false;

	const key = authorization.replace("Bearer ", "");

	if (!key) return false;

	const keyData = apiConfig.userKeys.find((i) => i.key === key);

	if (!keyData) return false;

	console.info(`Key: ${keyData.name}`);

	return true;
}
