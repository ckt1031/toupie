import type { BlankInput, H } from "hono/types";
import { listAllModels } from "../../helpers/models-utils";
import type { V1Env } from "./types";

type RequestHandler = H<V1Env, "/v1/models", BlankInput, Response>;

export const handleModelListRequest: RequestHandler = (c) => {
	// Extract allowed providers from authenticated user key
	const userKey = c.get("userKey");
	const allowedProviders = userKey?.allowedProviders;
	const allowedModels = userKey?.allowedModels;

	const data = {
		object: "list",
		data: listAllModels(allowedProviders, allowedModels),
	};

	return c.json(data);
};
