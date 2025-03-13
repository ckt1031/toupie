import * as fs from "node:fs";
import chalk from "chalk";
import slugify from "slugify";
import type { APIConfig } from "../schema";
import { apiConfigPath } from "./api-config";
import { cyan, green, red, rl, yellow } from "./cli-utils";

export async function chooseProvider(config: APIConfig): Promise<string> {
	// List providers with numbers
	console.log(cyan("\nAvailable Providers:"));
	const providerList = Object.keys(config.providers);
	providerList.forEach((providerName, index) => {
		console.log(
			`${index + 1}\t${config.providers[providerName].name} (${providerName})`,
		);
	});
	const choice = await rl.question(yellow("Enter the provider number: "));

	const providerIndex = Number.parseInt(choice) - 1;

	return providerList[providerIndex];
}

export async function removeProvider(config: APIConfig): Promise<APIConfig> {
	const providerName = await chooseProvider(config);
	const confirmation = await rl.question(
		yellow(`Type "confirm" to remove provider "${providerName}": `),
	);

	if (confirmation.toLowerCase() !== "confirm") {
		console.log(red("Removal cancelled."));
		return config;
	}

	delete config.providers[providerName];

	console.log(green(`Provider "${providerName}" removed successfully.`));

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
		console.log(chalk.green("API config is valid."));
	} catch (error) {
		console.error(chalk.red("API config validation error:"), error);
	}
}

export async function removeKeyFromExistingProvider(
	config: APIConfig,
): Promise<APIConfig> {
	const providerName = await chooseProvider(config);

	if (!config.providers[providerName]) {
		console.log(yellow("Provider not found."));
		return config;
	}

	const keyToRemove = await rl.question("Enter the API key to remove: ");
	const confirmation = await rl.question(
		yellow(
			`Type "confirm" to remove key "${keyToRemove}" from provider "${providerName}": `,
		),
	);

	if (confirmation.toLowerCase() !== "confirm") {
		console.log(red("Removal cancelled."));
		return config;
	}

	config.providers[providerName].keys = config.providers[
		providerName
	].keys.filter((key) => key !== keyToRemove);

	console.log(
		green(
			`API key "${keyToRemove}" removed from provider "${providerName}" successfully.`,
		),
	);
	return config;
}

export async function removeModelFromExistingProvider(
	config: APIConfig,
): Promise<APIConfig> {
	const providerName = await chooseProvider(config);

	if (!config.providers[providerName]) {
		console.log(yellow("Provider not found."));
		return config;
	}

	const modelToRemove = await rl.question("Enter the model to remove: ");
	const confirmation = await rl.question(
		yellow(
			`Type "confirm" to remove model "${modelToRemove}" from provider "${providerName}": `,
		),
	);

	if (confirmation.toLowerCase() !== "confirm") {
		console.log(red("Removal cancelled."));
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
		green(
			`Model "${modelToRemove}" removed from provider "${providerName}" successfully.`,
		),
	);

	return config;
}

export async function addProvider(config: APIConfig): Promise<APIConfig> {
	const name = await rl.question("Enter provider name: ");
	const baseURL = await rl.question(
		"Enter base URL (e.g., https://api.example.com/v1): ",
	);
	const isAzureInput = await rl.question(
		"Is this an Azure provider? (yes/no): ",
	);
	const isAzure = isAzureInput.toLowerCase() === "yes";

	let azureAPIVersion: string | undefined = undefined;
	if (isAzure) {
		azureAPIVersion = await rl.question(
			"Enter Azure API Version (e.g., 2024-10-21): ",
		);
	}

	const models: (string | { request: string; destination: string })[] = [];
	let addMoreModels = true;

	while (addMoreModels) {
		const modelName = await rl.question("Enter request model name: ");
		const needsCastingInput = await rl.question(
			`Does ${modelName} need casting? (yes/no): `,
		);

		if (needsCastingInput.toLowerCase() === "yes") {
			const destination = await rl.question(
				`Enter destination model for ${modelName}: `,
			);
			models.push({ request: modelName, destination });
		} else {
			models.push(modelName);
		}

		const addMore = await rl.question("Add another model? (yes/no): ");
		addMoreModels = addMore.toLowerCase() === "yes";
	}

	const keysInput = await rl.question("Enter API keys (comma-separated): ");
	const keys = keysInput.split(",").map((key) => key.trim());

	config.providers[slugify(name)] = {
		name,
		baseURL,
		models,
		keys,
		...(isAzure ? { azure: isAzure, azureAPIVersion: azureAPIVersion } : {}),
	};
	return config;
}

export async function addKeyToExistingProvider(
	config: APIConfig,
): Promise<APIConfig> {
	const providerName = await chooseProvider(config);

	if (!config.providers[providerName]) {
		console.log(yellow("Provider not found."));
		return config;
	}

	const keysInput = await rl.question("Enter API keys (comma-separated): ");
	const keys = keysInput.split(",").map((key) => key.trim());

	config.providers[providerName].keys = [
		...config.providers[providerName].keys,
		...keys,
	];
	return config;
}

export async function addModelToExistingProvider(
	config: APIConfig,
): Promise<APIConfig> {
	const providerName = await chooseProvider(config);

	if (!config.providers[providerName]) {
		console.log("Provider not found.");
		return config;
	}

	let addMoreModels = true;
	while (addMoreModels) {
		const modelName = await rl.question("Enter model name: ");
		const needsCastingInput = await rl.question(
			`Does ${modelName} need casting? (yes/no): `,
		);

		if (needsCastingInput.toLowerCase() === "yes") {
			const destination = await rl.question(
				`Enter destination model for ${modelName}: `,
			);
			config.providers[providerName].models.push({
				request: modelName,
				destination,
			});
		} else {
			config.providers[providerName].models.push(modelName);
		}

		const addMore = await rl.question("Add another model? (yes/no): ");
		addMoreModels = addMore.toLowerCase() === "yes";
	}
	return config;
}

export async function modifyProviderSettings(
	config: APIConfig,
): Promise<APIConfig> {
	const providerName = await chooseProvider(config);

	if (!config.providers[providerName]) {
		console.log("Provider not found.");
		return config;
	}

	const provider = config.providers[providerName]; // Create a copy
	const newName =
		(await rl.question(
			`Enter new name (leave empty to keep "${provider.name}"): `,
		)) || provider.name;
	const newBaseURL =
		(await rl.question(
			`Enter new base URL (leave empty to keep "${provider.baseURL}"): `,
		)) || provider.baseURL;

	const isAzureInput = await rl.question(
		`Is this an Azure provider? (yes/no, leave empty to keep "${provider.azure}"): `,
	);
	let isAzure: boolean = provider.azure ?? false;
	if (isAzureInput !== "") {
		isAzure = isAzureInput.toLowerCase() === "yes";
	}

	let azureAPIVersion: string | undefined = provider.azureAPIVersion;
	if (isAzure) {
		azureAPIVersion =
			(await rl.question(
				`Enter Azure API Version (leave empty to keep "${provider.azureAPIVersion}"): `,
			)) || provider.azureAPIVersion;
	}

	config.providers[providerName] = {
		...provider,
		name: newName,
		baseURL: newBaseURL,
		...(isAzure
			? { azure: isAzure, azureAPIVersion: azureAPIVersion }
			: { azure: false }),
	};
	return config;
}
