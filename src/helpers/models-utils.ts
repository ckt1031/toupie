import apiConfig from "../../data/api.json";
import type { APIConfig } from "../schema";

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

export function listAllModels(
	allowedProviders?: string[],
	allowedModels?: string[],
) {
	const list: Model[] = [];
	const modelIds = new Set<string>();

	const config = apiConfig as APIConfig;

	for (const [providerKey, provider] of Object.entries(config.providers)) {
		if (provider.enabled === false) continue;

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

			// If allowedModels is specified, only include models in the allowed list
			if (allowedModels && !allowedModels.includes(modelId)) {
				continue;
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
