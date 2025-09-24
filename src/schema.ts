import { z } from "zod";

/**
 * Validates that all allowedProviders entries reference existing providers
 */
function validateAllowedProviders(data: APIConfig) {
	const providerNames = Object.keys(data.providers);

	for (const userKey of data.userKeys) {
		if (userKey.allowedProviders) {
			for (const providerName of userKey.allowedProviders) {
				if (!providerNames.includes(providerName)) {
					throw new Error(
						`Invalid provider "${providerName}" in allowedProviders for specific key`,
					);
				}
			}
		}
	}

	return true;
}

/**
 * Validates that all allowedModels entries reference existing models
 */
function validateAllowedModels(data: APIConfig) {
	// Build a set of all available model IDs across all providers
	const modelIds = new Set<string>();

	for (const provider of Object.values(data.providers)) {
		for (const model of provider.models) {
			if (typeof model === "string") {
				modelIds.add(model);
			} else {
				modelIds.add(model.request ?? model.destination);
			}
		}
	}

	for (const userKey of data.userKeys) {
		if (userKey.allowedModels) {
			for (const modelId of userKey.allowedModels) {
				if (!modelIds.has(modelId)) {
					throw new Error(
						`Invalid model "${modelId}" in allowedModels for specific key`,
					);
				}
			}
		}
	}

	return true;
}

/**
 * Check duplicate provider names
 */
function validateDuplicateProviderKey(data: APIConfig) {
	const providerKeys = Object.values(data.providers).flatMap(
		(provider) => provider.keys,
	);

	for (const key of providerKeys) {
		if (providerKeys.filter((k) => k === key).length > 1) {
			throw new Error(`Duplicate provider key: ${key}`);
		}
	}

	return true;
}

export const apiConfigSchema = z
	.object({
		/**
		 * JSON Schema reference
		 */
		$schema: z.string().optional(),
		/**
		 * Keys received from this project API server
		 */
		userKeys: z.array(
			z.object({
				name: z.string(),
				key: z.string(),
				/**
				 * List of allowed provider names. If empty or not provided, all providers are allowed.
				 * If provided, only these providers can be used with this key.
				 */
				allowedProviders: z.array(z.string()).optional(),
				/**
				 * List of allowed model IDs. If empty array, no models are allowed.
				 * If not provided, all models are allowed.
				 */
				allowedModels: z.array(z.string()).optional(),
			}),
		),
		providers: z.record(
			z.string(),
			z.object({
				name: z.string(),
				baseURL: z.string(),
				models: z.array(
					z.union([
						z.string(),
						z.object({
							/**
							 * The model ID to be RECEIVED from the API server (this project)
							 * This is optional, if not provided, the destination will be used for receiving.
							 */
							request: z.optional(z.string()),
							/**
							 * The model ID to be SENT to the provider.
							 */
							destination: z.string(),
						}),
					]),
				),
				/**
				 * API Keys SENT to the providiers
				 */
				keys: z.array(z.string()),
				/**
				 * Is Microsoft Azure API
				 */
				azure: z.boolean().optional(),
				/**
				 * This is required if API is Azure mode
				 */
				azureAPIVersion: z.string().optional(),

				testModel: z.string().optional(),

				/**
				 * Enable or disable the provider.
				 * @default true
				 */
				enabled: z.boolean().optional(),

				/**
				 * Priority for provider selection. Higher numbers have higher priority.
				 * Providers with the same priority are randomly selected.
				 * If not specified, defaults to 0.
				 */
				priority: z.number().int().optional(),
			}),
		),
	})
	.refine(
		(data) => {
			validateAllowedProviders(data);
			validateAllowedModels(data);
			validateDuplicateProviderKey(data);
			return true;
		},
		{
			message: "Invalid API config",
		},
	);

export type APIConfig = z.infer<typeof apiConfigSchema>;
