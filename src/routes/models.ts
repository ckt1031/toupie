import { json } from "itty-router";
import apiConfig from "../../data/api.json";

interface Model {
	id: string;
	object: string;
	created: number;
	owned_by: string;
}

export function handleModelListRequest() {
	const list: Model[] = [];

	for (const provider of Object.values(apiConfig.providers)) {
		for (const model of provider.models) {
			const modelId = typeof model === "string" ? model : model.request;

			// Check if there is the same model in the list
			if (list.find((m) => m.id === modelId)) continue;

			// Reject if model is not chat model
			if (modelId.includes("embed") || modelId.includes("whisper")) continue;

			list.push({
				id: modelId,
				object: "model",
				created: 1686935002,
				owned_by: "openai",
			});
		}
	}

	const data = {
		object: "list",
		data: list,
	};

	return json(data);
}
