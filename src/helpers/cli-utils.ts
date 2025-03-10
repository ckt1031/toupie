import * as readline from "node:readline/promises";
import chalk from "chalk";
import testAPI from "../tasks/test-api";
import { type APIConfig, apiConfigSchema, saveApiConfig } from "./api-config";
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
import { addUserApiKey, removeUserApiKey } from "./user-key-utils";

export const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

export const cyan = chalk.cyan;
export const yellow = chalk.yellow;
export const red = chalk.red;
export const green = chalk.green;

export async function displayMenu(config: APIConfig): Promise<void> {
	console.log(chalk.cyan("\nChoose an action:"));

	const actions = [
		{
			name: "Add User API Key",
			action: async (config: APIConfig) => {
				return addUserApiKey(config);
			},
		},
		{
			name: "Add Provider",
			action: async (config: APIConfig) => {
				return addProvider(config);
			},
		},
		{
			name: "Add Key to Existing Provider",
			action: async (config: APIConfig) => {
				return addKeyToExistingProvider(config);
			},
		},

		{
			name: "Add Model to Existing Provider",
			action: async (config: APIConfig) => {
				return addModelToExistingProvider(config);
			},
		},

		{
			name: "Modify Provider Settings",
			action: async (config: APIConfig) => {
				return modifyProviderSettings(config);
			},
		},
		{
			name: "Remove User API Key",
			action: async (config: APIConfig) => {
				return removeUserApiKey(config);
			},
		},
		{
			name: "Remove Provider",
			action: async (config: APIConfig) => {
				return removeProvider(config);
			},
		},
		{
			name: "Remove Key from Existing Provider",
			action: async (config: APIConfig) => {
				return removeKeyFromExistingProvider(config);
			},
		},
		{
			name: "Remove Model from Existing Provider",
			action: async (config: APIConfig) => {
				return removeModelFromExistingProvider(config);
			},
		},
		{
			name: "Validate API Config",
			action: async () => {
				return validateApiConfig();
			},
		},
		{
			name: "Test API Models",
			action: async () => {
				return testAPI();
			},
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

	// Print a newline for better readability
	console.log("");

	let updatedConfig: APIConfig | undefined;

	const actionIndex = Number.parseInt(choice) - 1;
	if (actions[actionIndex]) {
		const res = await actions[actionIndex].action(config);

		const { success } = await apiConfigSchema.safeParseAsync(res);

		if (res && success) {
			await saveApiConfig(updatedConfig || config);
		}
	} else {
		console.log(chalk.red("Invalid choice. Please try again."));
	}

	displayMenu(updatedConfig || config);
}
