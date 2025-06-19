import apiConfig from "../../data/api.json";
import type { APIConfig } from "../schema";

type Provider = APIConfig["providers"][string];

// Create a map of modelId to providers
const modelIdToProviders: Record<string, Provider[]> = {};

for (const provider of Object.values(apiConfig.providers) as Provider[]) {
	for (const model of provider.models) {
		// Get the modelId
		const modelId =
			typeof model === "string" ? model : model.request || model.destination;

		// If the modelId is not in the map, add it
		if (!modelIdToProviders[modelId]) modelIdToProviders[modelId] = [];

		modelIdToProviders[modelId].push(provider);
	}
}

function getRandomElement<T>(array: T[]): T {
	if (!array || array.length === 0) {
		throw new Error("Array is empty");
	}

	// Return the first element if the array has only one element to save time
	if (array.length === 1) {
		return array[0];
	}

	if (array.length > 2 ** 32 - 1) {
		throw new RangeError("Array too large");
	}

	const maxRandomValue = 2 ** 32;
	const randomBuffer = new Uint32Array(1);

	let randomIndex: number;

	do {
		crypto.getRandomValues(randomBuffer);
		randomIndex = Math.floor((randomBuffer[0] / maxRandomValue) * array.length);
	} while (randomIndex >= array.length);

	return array[randomIndex];
}

function getModelInfoFromProvider(
	provider: Provider,
	modelId: string,
): Exclude<APIConfig["providers"][string]["models"][number], string> {
	const model = provider.models.find((model) => {
		return typeof model === "string"
			? model === modelId
			: model.request === modelId || model.destination === modelId;
	});

	if (!model)
		throw new Error(`Model ${modelId} not found in provider ${provider.name}`);

	return {
		request:
			typeof model === "string" ? model : model.request || model.destination,
		destination: typeof model === "string" ? model : model.destination,
	};
}

/**
 * Randomly pick a provider for the model based on the model id
 */
export function pickModelChannel(modelId: string, excludeKeys: string[] = []) {
	const providers = modelIdToProviders[modelId];

	if (!providers || providers.length === 0) return null;

	// First, we will randomly pick a provider from the filtered list
	const pickedProvider = getRandomElement(providers);

	// Random pick a key from the provider
	const pickedKeyFromProvider = getRandomElement(
		pickedProvider.keys.filter((key) => !excludeKeys.includes(key)),
	);

	// Handle model request
	const chosenModel = getModelInfoFromProvider(pickedProvider, modelId);

	return {
		apiKey: {
			index: pickedProvider.keys.indexOf(pickedKeyFromProvider),
			value: pickedKeyFromProvider,
		},
		provider: {
			name: pickedProvider.name,
			model: chosenModel.destination,
			baseURL: pickedProvider.baseURL,
			isAzure:
				"azure" in pickedProvider ? (pickedProvider.azure as boolean) : false,
			azureAPIVersion:
				"azureAPIVersion" in pickedProvider
					? (pickedProvider.azureAPIVersion as string)
					: undefined,
		},
	};
}
