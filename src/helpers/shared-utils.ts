import { confirm, input, select } from "@inquirer/prompts";
import type { APIConfig } from "../schema";

/**
 * Prompts user to select a provider from the available providers
 */
export async function selectProvider(config: APIConfig): Promise<string> {
	const providerChoices = Object.entries(config.providers).map(
		([key, provider]) => ({
			name: `${provider.name} (${key})${
				provider.enabled === false ? " (disabled)" : ""
			}`,
			value: key,
		}),
	);

	return select({
		message: "Select a provider:",
		choices: providerChoices,
	});
}

/**
 * Prompts user to select a user API key from the available keys
 */
export async function selectUserApiKey(config: APIConfig): Promise<string> {
	const keyChoices = config.userKeys.map((key) => ({
		name: key.name,
		value: key.name,
	}));

	return select({
		message: "Select a user API key:",
		choices: keyChoices,
	});
}

/**
 * Prompts for confirmation with a custom message
 */
export async function confirmAction(message: string): Promise<boolean> {
	return confirm({
		message,
		default: false,
	});
}

/**
 * Prompts for text input with optional default value
 */
export async function promptInput(
	message: string,
	defaultValue?: string,
): Promise<string> {
	return input({
		message,
		default: defaultValue,
	});
}

/**
 * Prompts for comma-separated input and returns array of trimmed values
 */
export async function promptCommaSeparated(message: string): Promise<string[]> {
	const input = await promptInput(message);
	return input
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

/**
 * Prompts for yes/no question
 */
export async function promptYesNo(message: string): Promise<boolean> {
	const answer = await select({
		message,
		choices: [
			{ name: "Yes", value: true },
			{ name: "No", value: false },
		],
	});

	return answer;
}
