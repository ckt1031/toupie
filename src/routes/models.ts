import { json } from "itty-router";
import apiConfig from "../../data/api.json";

interface Model {
	id: string;
	object: string;
	created: number;
	owned_by: string;
}

interface ModelConfig {
	request: string;
	destination: string;
}

export function handleModelListRequest() {
	const list: Model[] = [];
	const modelIds = new Set<string>();

	for (const provider of Object.values(apiConfig.providers)) {
		for (const model of provider.models) {
			let modelId = "";

			if (typeof model === "string") {
				modelId = model;
			} else {
				modelId =
					(model as ModelConfig).request || (model as ModelConfig).destination;
			}

			if (modelIds.has(modelId)) continue;

			// Add the model to model cache to avoid duplicates
			modelIds.add(modelId);

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
