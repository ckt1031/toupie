import { json } from "itty-router";
import { listAllModels } from "../helpers/models-utils";
import type { APIConfig } from "../schema";

// Extend the Request interface to include userKey
interface AuthenticatedRequest extends Request {
	userKey?: APIConfig["userKeys"][number];
}

export function handleModelListRequest(request: AuthenticatedRequest) {
	// Extract allowed providers from authenticated user key
	const userKey = request.userKey;
	const allowedProviders = userKey?.allowedProviders;

	const data = {
		object: "list",
		data: listAllModels(allowedProviders),
	};

	return json(data);
}
