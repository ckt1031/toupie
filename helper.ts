import * as fs from "node:fs";
import * as readline from "node:readline/promises";
import chalk from "chalk";
import slugify from "slugify";
import { z } from "zod";
import { generateKey } from "./src/crypto";

const apiConfigPath = "./data/api.json";

const apiConfigSchema = z.object({
	userKeys: z.array(z.object({ name: z.string(), key: z.string() })),
	providers: z.record(
		z.object({
			name: z.string(),
			baseURL: z.string(),
			models: z.array(
				z.union([
					z.string(),
					z.object({ request: z.string(), destination: z.string() }),
				]),
			),
			keys: z.array(z.string()),
			azure: z.boolean().optional(),
			azureAPIVersion: z.string().optional(),
		}),
	),
});

type APIConfig = z.infer<typeof apiConfigSchema>;

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

async function loadApiConfig(): Promise<APIConfig> {
	try {
		const data = await fs.promises.readFile(apiConfigPath, "utf-8");
		return JSON.parse(data) as APIConfig;
	} catch (error) {
		console.error(chalk.red("Error loading api config:"), error);
		return { userKeys: [], providers: {} };
	}
}

async function saveApiConfig(config: APIConfig): Promise<void> {
	try {
		await fs.promises.writeFile(
			apiConfigPath,
			JSON.stringify(config, null, 4),
			"utf-8",
		);
		console.log(chalk.green("API config saved successfully."));
	} catch (error) {
		console.error(chalk.red("Error saving api config:"), error);
	}
}

async function chooseProvider(config: APIConfig): Promise<string> {
	// List providers with numbers
	console.log(chalk.cyan("\nAvailable Providers:"));
	const providerList = Object.keys(config.providers);
	providerList.forEach((providerName, index) => {
		console.log(
			`${index + 1}\t${config.providers[providerName].name} (${providerName})`,
		);
	});
	const choice = await rl.question(chalk.yellow("Enter the provider number: "));

	const providerIndex = Number.parseInt(choice) - 1;

	return providerList[providerIndex];
}

async function addUserApiKey(config: APIConfig): Promise<APIConfig> {
	const name = await rl.question("Enter user API key name: ");
	const key = `sk-${generateKey()}`;
	config.userKeys.push({ name, key });
	console.log(chalk.green(`Generated API key: ${key}`));
	return config;
}

async function chooseUserAPIKeyName(config: APIConfig): Promise<string> {
	console.log(chalk.cyan("\nAvailable User API Keys:"));

	config.userKeys.forEach((key, index) => {
		console.log(`${index + 1}\t${key.name}`);
	});

	const choice = await rl.question(chalk.yellow("Enter the key number: "));

	const keyIndex = Number.parseInt(choice) - 1;

	return config.userKeys[keyIndex].name;
}

async function removeUserApiKey(config: APIConfig): Promise<APIConfig> {
	const name = await chooseUserAPIKeyName(config);
	const confirmation = await rl.question(
		chalk.yellow(`Type "confirm" to remove API key "${name}": `),
	);

	if (confirmation.toLowerCase() !== "confirm") {
		console.log(chalk.red("Removal cancelled."));
		return config;
	}

	config.userKeys = config.userKeys.filter((key) => key.name !== name);
	console.log(chalk.green(`API key "${name}" removed successfully.`));
	return config;
}

async function removeProvider(config: APIConfig): Promise<APIConfig> {
	const providerName = await chooseProvider(config);
	const confirmation = await rl.question(
		chalk.yellow(`Type "confirm" to remove provider "${providerName}": `),
	);

	if (confirmation.toLowerCase() !== "confirm") {
		console.log(chalk.red("Removal cancelled."));
		return config;
	}

	delete config.providers[providerName];

	console.log(chalk.green(`Provider "${providerName}" removed successfully.`));

	return config;
}

async function removeKeyFromExistingProvider(
	config: APIConfig,
): Promise<APIConfig> {
	const providerName = await chooseProvider(config);

	if (!config.providers[providerName]) {
		console.log(chalk.yellow("Provider not found."));
		return config;
	}

	const keyToRemove = await rl.question("Enter the API key to remove: ");
	const confirmation = await rl.question(
		chalk.yellow(
			`Type "confirm" to remove key "${keyToRemove}" from provider "${providerName}": `,
		),
	);

	if (confirmation.toLowerCase() !== "confirm") {
		console.log(chalk.red("Removal cancelled."));
		return config;
	}

	config.providers[providerName].keys = config.providers[
		providerName
	].keys.filter((key) => key !== keyToRemove);

	console.log(
		chalk.green(
			`API key "${keyToRemove}" removed from provider "${providerName}" successfully.`,
		),
	);
	return config;
}

async function removeModelFromExistingProvider(
	config: APIConfig,
): Promise<APIConfig> {
	const providerName = await chooseProvider(config);

	if (!config.providers[providerName]) {
		console.log(chalk.yellow("Provider not found."));
		return config;
	}

	const modelToRemove = await rl.question("Enter the model to remove: ");
	const confirmation = await rl.question(
		chalk.yellow(
			`Type "confirm" to remove model "${modelToRemove}" from provider "${providerName}": `,
		),
	);

	if (confirmation.toLowerCase() !== "confirm") {
		console.log(chalk.red("Removal cancelled."));
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
		chalk.green(
			`Model "${modelToRemove}" removed from provider "${providerName}" successfully.`,
		),
	);

	return config;
}

async function addProvider(config: APIConfig): Promise<APIConfig> {
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

async function addKeyToExistingProvider(config: APIConfig): Promise<APIConfig> {
	const providerName = await chooseProvider(config);

	if (!config.providers[providerName]) {
		console.log(chalk.yellow("Provider not found."));
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

async function addModelToExistingProvider(
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

async function modifyProviderSettings(config: APIConfig): Promise<APIConfig> {
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

async function validateApiConfig(): Promise<void> {
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

async function displayMenu(config: APIConfig): Promise<void> {
	console.log(chalk.cyan("\nChoose an action:"));

	const actions = [
		{
			name: "Add User API Key",
			action: addUserApiKey,
		},
		{
			name: "Add Provider",
			action: addProvider,
		},
		{
			name: "Add Key to Existing Provider",
			action: addKeyToExistingProvider,
		},

		{
			name: "Add Model to Existing Provider",
			action: addModelToExistingProvider,
		},

		{
			name: "Modify Provider Settings",
			action: modifyProviderSettings,
		},
		{
			name: "Remove User API Key",
			action: removeUserApiKey,
		},
		{
			name: "Remove Provider",
			action: removeProvider,
		},
		{
			name: "Remove Key from Existing Provider",
			action: removeKeyFromExistingProvider,
		},
		{
			name: "Remove Model from Existing Provider",
			action: removeModelFromExistingProvider,
		},
		{
			name: "Validate API Config",
			action: validateApiConfig,
		},
		{
			name: "Exit",
			action: () => {
				console.log(chalk.red("Exiting..."));
				rl.close();
				process.exit(0);
				return;
			},
		},
	];

	actions.forEach((action, index) => {
		console.log(`${index + 1}\t${action.name}`);
	});

	const choice = await rl.question(chalk.yellow("Enter your choice: "));

	let updatedConfig: APIConfig = config;

	const actionIndex = Number.parseInt(choice) - 1;
	if (actions[actionIndex]) {
		const res = await actions[actionIndex].action(config);

		const { success } = await apiConfigSchema.safeParseAsync(res);

		if (res && success) updatedConfig = res;
	} else {
		console.log(chalk.red("Invalid choice. Please try again."));
	}

	await saveApiConfig(updatedConfig);
	displayMenu(updatedConfig); // Show the menu again
}

const initialConfig = await loadApiConfig();
displayMenu(initialConfig);
