import { error } from "itty-router";
import apiConfig from "../data/api.json";

const apiKeyMap = new Map(apiConfig.userKeys.map((item) => [item.key, item]));

/**
 *  Match keys in Authorization header
 */
export function handleAuth(request: Request) {
	const headers = request.headers;
	const authorization = headers.get("Authorization");

	if (!authorization) return error(401, "Missing key");

	const keyData = apiKeyMap.get(authorization.replace("Bearer ", ""));

	if (!keyData) return error(401, "Invalid key");

	console.info(`Key: ${keyData.name}`);
}
