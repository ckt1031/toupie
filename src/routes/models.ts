import { json } from "itty-router";
import { listAllModels } from "../helpers/models-utils";

export function handleModelListRequest() {
	const data = {
		object: "list",
		data: listAllModels(),
	};

	return json(data);
}
