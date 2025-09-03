import * as fs from "node:fs";
import slugify from "slugify";
import type { APIConfig } from "../schema";
import { apiConfigPath } from "./api-config";
import {
	confirmAction,
	promptCommaSeparated,
	promptInput,
	promptYesNo,
	selectProvider,
} from "./shared-utils";

// chooseProvider is now available from shared-utils as selectProvider

export async function removeProvider(config: APIConfig): Promise<APIConfig> {
	const providerName = await selectProvider(config);
	const confirmed = await confirmAction(`Remove provider "${providerName}"?`);

	if (!confirmed) {
		console.log("Removal cancelled.");
		return config;
	}

	delete config.providers[providerName];
	console.log(`Provider "${providerName}" removed successfully.`);
	return config;
}

export async function validateApiConfig(): Promise<void> {
	try {
		const data = await fs.promises.readFile(apiConfigPath, "utf-8");
		const config = JSON.parse(data) as APIConfig;
		// Basic validation - check if userKeys and providers are present
		if (!config.userKeys || !config.providers) {
			throw new Error("Config is missing userKeys or providers.");
		}
		// More detailed validation can be added here, e.g., using Zod
		console.log("API config is valid.");
	} catch (error) {
		console.error(`API config validation error: ${error}`);
	}
}

export async function removeKeyFromExistingProvider(
	config: APIConfig,
): Promise<APIConfig> {
	const providerName = await selectProvider(config);

	if (!config.providers[providerName]) {
		console.log("Provider not found.");
		return config;
	}

	const keyToRemove = await promptInput("Enter the API key to remove");
	const confirmed = await confirmAction(
		`Remove key "${keyToRemove}" from provider "${providerName}"?`,
	);

	if (!confirmed) {
		console.log("Removal cancelled.");
		return config;
	}

	config.providers[providerName].keys = config.providers[
		providerName
	].keys.filter((key) => key !== keyToRemove);

	console.log(
		`API key "${keyToRemove}" removed from provider "${providerName}" successfully.`,
	);
	return config;
}

export async function removeModelFromExistingProvider(
	config: APIConfig,
): Promise<APIConfig> {
	const providerName = await selectProvider(config);

	if (!config.providers[providerName]) {
		console.log("Provider not found.");
		return config;
	}

	const modelToRemove = await promptInput("Enter the model to remove");
	const confirmed = await confirmAction(
		`Remove model "${modelToRemove}" from provider "${providerName}"?`,
	);

	if (!confirmed) {
		console.log("Removal cancelled.");
		return config;
	}

	config.providers[providerName].models = config.providers[
		providerName
	].models.filter((model) => {
		if (typeof model === "string") {
			return model !== modelToRemove;
		}
		return model.request !== modelToRemove;
	});

	console.log(
		`Model "${modelToRemove}" removed from provider "${providerName}" successfully.`,
	);
	return config;
}

export async function addProvider(config: APIConfig): Promise<APIConfig> {
	const name = await promptInput("Enter provider name");
	const baseURL = await promptInput(
		"Enter base URL (e.g., https://api.example.com/v1)",
	);
	const isAzure = await promptYesNo("Is this an Azure provider?");

	let azureAPIVersion: string | undefined;
	if (isAzure) {
		azureAPIVersion = await promptInput(
			"Enter Azure API Version (e.g., 2024-10-21)",
		);
	}

	const models: (string | { request: string; destination: string })[] = [];
	let addMoreModels = true;

	while (addMoreModels) {
		const modelName = await promptInput("Enter request model name");
		const needsCasting = await promptYesNo(`Does ${modelName} need casting?`);

		if (needsCasting) {
			const destination = await promptInput(
				`Enter destination model for ${modelName}`,
			);
			models.push({ request: modelName, destination });
		} else {
			models.push(modelName);
		}

		addMoreModels = await promptYesNo("Add another model?");
	}

	const keys = await promptCommaSeparated("Enter API keys (comma-separated)");

	config.providers[slugify(name)] = {
		name,
		baseURL,
		models,
		keys,
		enabled: true,
		...(isAzure ? { azure: isAzure, azureAPIVersion: azureAPIVersion } : {}),
	};
	return config;
}

export async function addKeyToExistingProvider(
	config: APIConfig,
): Promise<APIConfig> {
	const providerName = await selectProvider(config);

	if (!config.providers[providerName]) {
		console.log("Provider not found.");
		return config;
	}

	const keys = await promptCommaSeparated("Enter API keys (comma-separated)");

	config.providers[providerName].keys = [
		...config.providers[providerName].keys,
		...keys,
	];
	return config;
}

export async function addModelToExistingProvider(
	config: APIConfig,
): Promise<APIConfig> {
	const providerName = await selectProvider(config);

	if (!config.providers[providerName]) {
		console.log("Provider not found.");
		return config;
	}

	let addMoreModels = true;
	while (addMoreModels) {
		const modelName = await promptInput("Enter model name");
		const needsCasting = await promptYesNo(`Does ${modelName} need casting?`);

		if (needsCasting) {
			const destination = await promptInput(
				`Enter destination model for ${modelName}`,
			);
			config.providers[providerName].models.push({
				request: modelName,
				destination,
			});
		} else {
			config.providers[providerName].models.push(modelName);
		}

		addMoreModels = await promptYesNo("Add another model?");
	}
	return config;
}

export async function modifyProviderSettings(
	config: APIConfig,
): Promise<APIConfig> {
	const providerName = await selectProvider(config);

	if (!config.providers[providerName]) {
		console.log("Provider not found.");
		return config;
	}

	const provider = config.providers[providerName];
	const newName = await promptInput(
		`Enter new name (leave empty to keep "${provider.name}")`,
		provider.name,
	);
	const newBaseURL = await promptInput(
		`Enter new base URL (leave empty to keep "${provider.baseURL}")`,
		provider.baseURL,
	);

	const isAzureInput = await promptInput(
		`Is this an Azure provider? (yes/no, leave empty to keep "${
			provider.azure ?? false
		}")`,
	);
	let isAzure: boolean = provider.azure ?? false;
	if (isAzureInput.trim() !== "") {
		isAzure = isAzureInput.toLowerCase() === "yes";
	}

	let azureAPIVersion: string | undefined = provider.azureAPIVersion;
	if (isAzure) {
		azureAPIVersion = await promptInput(
			`Enter Azure API Version (leave empty to keep "${provider.azureAPIVersion}")`,
			provider.azureAPIVersion,
		);
	}

	const enabledInput = await promptInput(
		`Enable this provider? (yes/no, leave empty to keep "${
			provider.enabled !== false ? "enabled" : "disabled"
		}")`,
	);
	let enabled: boolean = provider.enabled ?? true;
	if (enabledInput.trim() !== "") {
		enabled = enabledInput.toLowerCase() === "yes";
	}

	config.providers[providerName] = {
		...provider,
		name: newName,
		baseURL: newBaseURL,
		enabled,
		...(isAzure
			? { azure: isAzure, azureAPIVersion: azureAPIVersion }
			: { azure: false }),
	};
	return config;
}
