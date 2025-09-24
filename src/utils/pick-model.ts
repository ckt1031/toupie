import { sample, shuffle } from "lodash";
import apiConfig from "../../data/api.json";
import type { APIConfig } from "../schema";

type Provider = APIConfig["providers"][string];
type UserKey = APIConfig["userKeys"][number];

// Create a map of modelId to providers
const modelIdToProviders: Record<string, Provider[]> = {};

for (const provider of Object.values(apiConfig.providers) as Provider[]) {
	if (provider.enabled === false) continue;
	for (const model of provider.models) {
		// Get the modelId
		const modelId =
			typeof model === "string" ? model : model.request || model.destination;

		// If the modelId is not in the map, add it
		if (!modelIdToProviders[modelId]) modelIdToProviders[modelId] = [];

		modelIdToProviders[modelId].push(provider);
	}
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
 * Filter providers based on user key's allowedProviders and allowedModels
 */
function filterProvidersByUserKey(
	providers: Provider[],
	userKey: UserKey,
	requestedModelId?: string,
): Provider[] {
	// If allowedProviders is defined but empty, block all
	if (userKey.allowedProviders && userKey.allowedProviders.length === 0) {
		return [];
	}

	// Start from provider filter if specified
	let filtered = providers;

	if (userKey.allowedProviders && userKey.allowedProviders.length > 0) {
		filtered = filtered.filter((provider) => {
			const providerKey = Object.keys(apiConfig.providers).find(
				(key) =>
					apiConfig.providers[key as keyof typeof apiConfig.providers] ===
					provider,
			);
			return !!providerKey && userKey.allowedProviders?.includes(providerKey);
		});
	}

	// If allowedModels is defined:
	// - If empty array, block all
	// - If provided, ensure the requestedModelId is in the allowlist
	if (userKey.allowedModels) {
		if (userKey.allowedModels.length === 0) {
			return [];
		}
		if (requestedModelId && !userKey.allowedModels.includes(requestedModelId)) {
			return [];
		}
	}

	return filtered;
}

/**
 * Sort providers by priority (higher priority first) and randomly shuffle providers with the same priority
 */
function sortProvidersByPriority(providers: Provider[]): Provider[] {
	// Group providers by priority
	const priorityGroups: Record<number, Provider[]> = {};

	for (const provider of providers) {
		const priority = provider.priority ?? 0;
		if (!priorityGroups[priority]) {
			priorityGroups[priority] = [];
		}
		priorityGroups[priority].push(provider);
	}

	// Sort priorities in descending order (higher priority first)
	const sortedPriorities = Object.keys(priorityGroups)
		.map(Number)
		.sort((a, b) => b - a);

	// Shuffle providers within each priority group and combine them
	const sortedProviders: Provider[] = [];
	for (const priority of sortedPriorities) {
		const providersInGroup = priorityGroups[priority];
		// Shuffle the providers in this priority group using Lodash shuffle
		const shuffled = shuffle([...providersInGroup]);
		sortedProviders.push(...shuffled);
	}

	return sortedProviders;
}

/**
 * Shared helper function to select a provider and key for a model
 */
function selectProviderAndKey(
	modelId: string,
	excludeKeys: string[],
	userKey: UserKey | undefined,
	excludeProviderName?: string,
) {
	const providers = modelIdToProviders[modelId];

	if (!providers || providers.length === 0) return null;

	// Filter providers based on user key restrictions
	const allowedProviders = userKey
		? filterProvidersByUserKey(providers, userKey, modelId)
		: providers;

	// If no providers are allowed after filtering, return null
	if (allowedProviders.length === 0) {
		return null;
	}

	// Remove excluded provider if specified
	const availableProviders = excludeProviderName
		? allowedProviders.filter(
				(provider) => provider.name !== excludeProviderName,
			)
		: allowedProviders;

	// If no providers are available after filtering, return null
	if (availableProviders.length === 0) {
		return null;
	}

	// Sort providers by priority (higher priority first, random within same priority)
	const sortedProviders = sortProvidersByPriority(availableProviders);

	// Find the first provider that has available keys
	let pickedProvider: Provider | null = null;
	let availableKeys: string[] = [];

	for (const provider of sortedProviders) {
		const keys = provider.keys.filter((key) => !excludeKeys.includes(key));
		if (keys.length > 0) {
			pickedProvider = provider;
			availableKeys = keys;
			break;
		}
	}

	// If no provider has available keys, return null
	if (!pickedProvider) {
		return null;
	}

	// Random pick a key from the available keys
	const pickedKeyFromProvider = sample(availableKeys);
	if (!pickedKeyFromProvider) {
		return null;
	}

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

/**
 * Pick a provider for the model based on priority and user key restrictions
 * Higher priority providers are selected first, with random selection within the same priority level
 */
export function pickModelChannel(
	modelId: string,
	excludeKeys: string[] = [],
	userKey?: UserKey,
) {
	return selectProviderAndKey(modelId, excludeKeys, userKey);
}

/**
 * Pick a provider for the model, excluding failed providers and keys
 * This function handles both provider-level and key-level fallbacks
 */
export function pickModelChannelWithFallback(
	modelId: string,
	excludeKeys: string[] = [],
	excludeProviders: string[] = [],
	userKey?: UserKey,
) {
	const providers = modelIdToProviders[modelId];

	if (!providers || providers.length === 0) return null;

	// Filter providers based on user key restrictions
	const allowedProviders = userKey
		? filterProvidersByUserKey(providers, userKey, modelId)
		: providers;

	// Remove failed providers from the list
	const availableProviders = allowedProviders.filter(
		(provider) => !excludeProviders.includes(provider.name),
	);

	// If no providers are available after filtering, return null
	if (availableProviders.length === 0) {
		return null;
	}

	// Sort remaining providers by priority (higher priority first, random within same priority)
	const sortedProviders = sortProvidersByPriority(availableProviders);

	// Find the first provider that has available keys
	let pickedProvider: Provider | null = null;
	let availableKeys: string[] = [];

	for (const provider of sortedProviders) {
		const keys = provider.keys.filter((key) => !excludeKeys.includes(key));
		if (keys.length > 0) {
			pickedProvider = provider;
			availableKeys = keys;
			break;
		}
	}

	// If no provider has available keys, return null
	if (!pickedProvider) {
		return null;
	}

	// Random pick a key from the available keys
	const pickedKeyFromProvider = sample(availableKeys);
	if (!pickedKeyFromProvider) {
		return null;
	}

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

/**
 * Get a fallback provider for the model, excluding the failed provider
 * This function can be used when the primary provider fails and you need a fallback
 * @deprecated Use pickModelChannelWithFallback instead
 */
export function pickFallbackModelChannel(
	modelId: string,
	failedProviderName: string,
	excludeKeys: string[] = [],
	userKey?: UserKey,
) {
	return selectProviderAndKey(
		modelId,
		excludeKeys,
		userKey,
		failedProviderName,
	);
}
