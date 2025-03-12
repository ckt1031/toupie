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

function getRandomElement<T>(array: T[]): T {
	// if (!array || array.length === 0) {
	// 	return undefined;
	// }

	// if (array.length > 2 ** 32 - 1) {
	// 	throw new RangeError("Array too large");
	// }

	const maxRandomValue = 2 ** 32;
	const randomBuffer = new Uint32Array(1);

	let randomIndex: number;

	do {
		crypto.getRandomValues(randomBuffer);
		randomIndex = Math.floor((randomBuffer[0] / maxRandomValue) * array.length);
	} while (randomIndex >= array.length);

	return array[randomIndex];
}

/**
 * Randomly pick a provider for the model based on the model id
 */
export function pickModelChannel(modelId: string) {
	const providers = modelIdToProviders[modelId];

	if (!providers || providers.length === 0) return null;

	// Randomly pick a provider from the filtered list
	const provider = getRandomElement(providers);

	// Random pick a key from the provider
	const key = getRandomElement(provider.keys);

	// Handle model request
	const model = modelIdToModel[modelId];

	if (!model) return null;

	return {
		apiKey: {
			index: provider.keys.indexOf(key),
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
