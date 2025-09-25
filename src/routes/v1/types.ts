import type { APIConfig } from "../../schema";

export type V1Env = {
	Variables: {
		userKey: APIConfig["userKeys"][number];
	};
};
