import { sample, shuffle } from "lodash";
import apiConfig from "../../data/api.json";
import type { APIConfig } from "../schema";

type Provider = APIConfig["providers"][string];
type UserKey = APIConfig["userKeys"][number];

// Build a lookup table from a request model ID to all providers that support it.
// This is computed once at module load for quick routing during requests.
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

// Resolve how a provider expects to receive a model given a requested model ID.
// Returns the canonical request ID (what our API accepts) and destination
// (what the provider needs), handling both string and object model entries.
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
 * Filter providers using the user key's allowlists.
 *
 * - allowedProviders: if present and empty -> block all; if present and non-empty -> only those providers
 * - allowedModels: if present and empty -> block all; if present and non-empty -> requested model must be included
 */
function filterProvidersByUserKey(
	providers: Provider[],
	userKey: UserKey,
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

	return filtered;
}

/**
 * Sort providers by priority (higher priority first) and randomly shuffle providers with the same priority
 */
// Sort providers by numeric priority (desc). Providers with identical priority
// are shuffled to distribute load in a simple, fair way.
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
 * Selection with fallback: skips previously failed providers and keys while
 * still applying allowlists and priorities.
 */
export function pickModelChannelWithFallback(
	modelId: string,
	userKey: UserKey,
	excludeKeys: string[] = [],
	excludeProviders: string[] = [],
) {
	const providers = modelIdToProviders[modelId];

	if (!providers || providers.length === 0) return null;

	// Filter providers based on user key restrictions
	const allowedProviders = filterProvidersByUserKey(providers, userKey);

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
