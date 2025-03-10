import { error } from "itty-router";
import apiConfig from "../data/api.json";

/**
 *  Match keys in Authorization header
 */
export function handleAuth(request: Request) {
	const headers = request.headers;
	const authorization = headers.get("Authorization");

	if (!authorization) return error(401, "Missing key");

	const key = authorization.replace("Bearer ", "");

	if (!key) return error(401, "Invalid key");

	const keyData = apiConfig.userKeys.find((i) => i.key === key);

	if (!keyData) return error(401, "Invalid key");

	console.info(`Key: ${keyData.name}`);
}
