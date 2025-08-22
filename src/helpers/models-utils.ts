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

export function listAllModels(allowedProviders?: string[]) {
	const list: Model[] = [];
	const modelIds = new Set<string>();

	for (const [providerKey, provider] of Object.entries(apiConfig.providers)) {
		// If allowedProviders is specified, only include providers in the allowed list
		if (allowedProviders && !allowedProviders.includes(providerKey)) {
			continue;
		}

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

			const data: Model = {
				id: modelId,
				object: "model",
				created: 1686935002,
				owned_by: "openai",
			};

			list.push(data);
		}
	}

	return list;
}
