import apiConfig from "../../data/api.json";

// Define the Provider type based on the structure in apiConfig
interface Provider {
	name: string;
	baseURL: string;
	models: (string | { request: string; destination: string })[];
	keys: string[];
	azure?: boolean;
	azureAPIVersion?: string;
}

// Create a map of modelId to providers
const modelIdToProviders: Record<string, Provider[]> = {};

for (const provider of Object.values(apiConfig.providers) as Provider[]) {
	for (const model of provider.models) {
		// Get the modelId
		const modelId = typeof model === "string" ? model : model.request;

		// If the modelId is not in the map, add it
		if (!modelIdToProviders[modelId]) modelIdToProviders[modelId] = [];

		modelIdToProviders[modelId].push(provider);
	}
}

// Create a map of modelId to model
const modelIdToModel: Record<
	string,
	string | { request: string; destination: string }
> = {};

for (const provider of Object.values(apiConfig.providers) as Provider[]) {
	for (const model of provider.models) {
		// Get the modelId
		const modelId = typeof model === "string" ? model : model.request;

		modelIdToModel[modelId] = model;
	}
}

/**
 * Randomly pick a provider for the model based on the model id
 */
export function pickModelChannel(modelId: string) {
	const providers = modelIdToProviders[modelId];

	if (!providers || providers.length === 0) return null;

	// Randomly pick a provider from the filtered list
	const randomIndex = Math.floor(Math.random() * providers.length);
	const provider = providers[randomIndex];

	// Random pick a key from the provider
	const randomKeyIndex = Math.floor(Math.random() * provider.keys.length);
	const key = provider.keys[randomKeyIndex];

	// Handle model request
	const model = modelIdToModel[modelId];

	if (!model) return null;

	return {
		apiKey: {
			index: randomKeyIndex,
			value: key,
		},
		provider: {
			name: provider.name,
			model: typeof model === "string" ? model : model.destination,
			baseURL: provider.baseURL,
			isAzure: "azure" in provider ? (provider.azure as boolean) : false,
			azureAPIVersion:
				"azureAPIVersion" in provider
					? (provider.azureAPIVersion as string)
					: undefined,
		},
	};
}
