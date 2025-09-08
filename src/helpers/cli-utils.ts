import { select } from "@inquirer/prompts";
import { type APIConfig, apiConfigSchema } from "../schema";
import testAPI from "../tasks/test-api";
import { saveApiConfig } from "./api-config";
import { listAllModels } from "./models-utils";
import {
	addKeyToExistingProvider,
	addModelToExistingProvider,
	addProvider,
	modifyProviderSettings,
	removeKeyFromExistingProvider,
	removeModelFromExistingProvider,
	removeProvider,
	validateApiConfig,
} from "./provider-utils";

import {
	addUserApiKey,
	removeUserApiKey,
	rotateUserApiKey,
	viewUserApiKey,
} from "./user-key-utils";

export async function displayMenu(config: APIConfig): Promise<void> {
	const actionChoices = [
		{ name: "Add User API Key", value: "addUserKey" },
		{ name: "Add Provider", value: "addProvider" },
		{ name: "Add Key to Existing Provider", value: "addKeyToProvider" },
		{ name: "Add Model to Existing Provider", value: "addModelToProvider" },
		{ name: "View User API Key", value: "viewUserKey" },
		{ name: "Rotate User API Key", value: "rotateUserKey" },
		{ name: "Modify Provider Settings", value: "modifyProvider" },
		{ name: "Remove User API Key", value: "removeUserKey" },
		{ name: "Remove Provider", value: "removeProvider" },
		{
			name: "Remove Key from Existing Provider",
			value: "removeKeyFromProvider",
		},
		{
			name: "Remove Model from Existing Provider",
			value: "removeModelFromProvider",
		},
		{ name: "Validate API Config", value: "validateConfig" },
		{ name: "Test API Models", value: "testAPI" },
		{ name: "List All Models", value: "listModels" },
		{ name: "Exit", value: "exit" },
	];

	const choice = await select({
		message: "Choose an action:",
		choices: actionChoices,
	});

	let updatedConfig: APIConfig | undefined;

	switch (choice) {
		case "addUserKey":
			updatedConfig = await addUserApiKey(config);
			break;
		case "addProvider":
			updatedConfig = await addProvider(config);
			break;
		case "addKeyToProvider":
			updatedConfig = await addKeyToExistingProvider(config);
			break;
		case "addModelToProvider":
			updatedConfig = await addModelToExistingProvider(config);
			break;
		case "viewUserKey":
			await viewUserApiKey(config);
			break;
		case "rotateUserKey":
			updatedConfig = await rotateUserApiKey(config);
			break;
		case "modifyProvider":
			updatedConfig = await modifyProviderSettings(config);
			break;
		case "removeUserKey":
			updatedConfig = await removeUserApiKey(config);
			break;
		case "removeProvider":
			updatedConfig = await removeProvider(config);
			break;
		case "removeKeyFromProvider":
			updatedConfig = await removeKeyFromExistingProvider(config);
			break;
		case "removeModelFromProvider":
			updatedConfig = await removeModelFromExistingProvider(config);
			break;
		case "validateConfig":
			await validateApiConfig();
			break;
		case "testAPI":
			await testAPI();
			break;
		case "listModels": {
			const models = listAllModels();
			for (const model of models) {
				console.log(model.id);
			}
			break;
		}
		case "exit":
			console.log("Exiting...");
			process.exit(0);
	}

	// Save config if it was updated
	if (updatedConfig) {
		const { success } = await apiConfigSchema.safeParseAsync(updatedConfig);
		if (success) {
			await saveApiConfig(updatedConfig);
			console.log("Configuration saved successfully.");
		}
	}

	// Continue the menu loop (unless exiting)
	if (choice !== "exit") {
		// Print a newline
		console.log("");
		await displayMenu(updatedConfig || config);
	}
}
