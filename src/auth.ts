import { error } from "itty-router";
import apiConfig from "../data/api.json";
import type { APIConfig } from "./schema";

const apiKeyMap = new Map(apiConfig.userKeys.map((item) => [item.key, item]));

// Extend the Request interface to include userKey
export interface AuthenticatedRequest extends Request {
	userKey?: APIConfig["userKeys"][number];
}

/**
 *  Match keys in Authorization header
 */
export function handleAuth(request: Request) {
	const headers = request.headers;
	const authorization = headers.get("Authorization");

	if (!authorization) return error(401, "Missing key");

	// Check if Bearer token is present
	if (!authorization.startsWith("Bearer ")) {
		return error(401, "Invalid authorization format");
	}

	const keyData = apiKeyMap.get(authorization.replace("Bearer ", ""));

	if (!keyData) return error(401, "Invalid key");

	console.info(`Key: ${keyData.name}`);

	// Store the user key data in the request object for later use
	(request as AuthenticatedRequest).userKey = keyData;
}
