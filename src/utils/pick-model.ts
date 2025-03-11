import apiConfig from "../../data/api.json";

/**
 * Randomly pick a provider for the model based on the model id
 */
export function pickModelChannel(modelId: string) {
	const providers = Object.values(apiConfig.providers).filter((provider) =>
		provider.models.some((m) =>
			typeof m === "string" ? m === modelId : m.request === modelId,
		),
	);

	if (providers.length === 0) return null;

	// Randomly pick a provider from the filtered list
	const randomIndex = Math.floor(Math.random() * providers.length);
	const provider = providers[randomIndex];

	// Random pick a key from the provider
	const randomKeyIndex = Math.floor(Math.random() * provider.keys.length);
	const key = provider.keys[randomKeyIndex];

	// Handle model request
	const model = provider.models.find((m) =>
		typeof m === "string" ? m === modelId : m.request === modelId,
	);

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
