import * as fs from "node:fs";
import * as readline from "node:readline/promises";
import chalk from "chalk";
import { generateKey } from "./src/crypto";

const apiConfigPath = "./data/api.json";

interface ApiConfig {
	userKeys: { name: string; key: string }[];
	providers: {
		[key: string]: {
			name: string;
			baseURL: string;
			models: (string | { request: string; destination: string })[];
			keys: string[];
			azure?: boolean;
			azureAPIVersion?: string;
		};
	};
}

async function main() {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	async function loadApiConfig(): Promise<ApiConfig> {
		try {
			const data = await fs.promises.readFile(apiConfigPath, "utf-8");
			return JSON.parse(data) as ApiConfig;
		} catch (error) {
			console.error(chalk.red("Error loading api config:"), error);
			return { userKeys: [], providers: {} };
		}
	}

	async function saveApiConfig(config: ApiConfig): Promise<void> {
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

	async function addUserApiKey(config: ApiConfig): Promise<ApiConfig> {
		const name = await rl.question("Enter user API key name: ");
		const key = `sk-${generateKey()}`;
		config.userKeys.push({ name, key });
		console.log(chalk.green(`Generated API key: ${key}`));
		return config;
	}

	async function addProvider(config: ApiConfig): Promise<ApiConfig> {
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
			const modelName = await rl.question("Enter model name: ");
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

		config.providers[name] = {
			name,
			baseURL,
			models,
			keys,
			...(isAzure ? { azure: isAzure, azureAPIVersion: azureAPIVersion } : {}),
		};
		return config;
	}

	async function addKeyToExistingProvider(
		config: ApiConfig,
	): Promise<ApiConfig> {
		const providerName = await rl.question(
			"Enter the name of the provider to add the key to: ",
		);

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
		config: ApiConfig,
	): Promise<ApiConfig> {
		const providerName = await rl.question(
			"Enter the name of the provider to add the model to: ",
		);

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

	async function modifyProviderSettings(config: ApiConfig): Promise<ApiConfig> {
		const providerName = await rl.question(
			"Enter the name of the provider to modify: ",
		);

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

	async function displayMenu(config: ApiConfig): Promise<void> {
		console.log(chalk.cyan("\nChoose an action:"));
		console.log(chalk.green("1. Add User API Key"));
		console.log(chalk.green("2. Add Provider"));
		console.log(chalk.green("3. Add Key to Existing Provider"));
		console.log(chalk.green("4. Add Model to Existing Provider"));
		console.log(chalk.green("5. Modify Provider Settings"));
		console.log(chalk.green("6. Exit"));

		const choice = await rl.question(chalk.yellow("Enter your choice: "));

		let updatedConfig: ApiConfig = config;

		switch (choice) {
			case "1":
				updatedConfig = await addUserApiKey(config);
				break;
			case "2":
				updatedConfig = await addProvider(config);
				break;
			case "3":
				updatedConfig = await addKeyToExistingProvider(config);
				break;
			case "4":
				updatedConfig = await addModelToExistingProvider(config);
				break;
			case "5":
				updatedConfig = await modifyProviderSettings(config);
				break;
			case "6":
				console.log(chalk.red("Exiting..."));
				rl.close();
				return;
			default:
				console.log(chalk.red("Invalid choice. Please try again."));
		}

		await saveApiConfig(updatedConfig);
		displayMenu(updatedConfig); // Show the menu again
	}

	const initialConfig = await loadApiConfig();
	displayMenu(initialConfig);
}

main().catch(console.error);
