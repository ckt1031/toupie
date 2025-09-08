import type { APIConfig } from "../schema";
import {
	confirmAction,
	promptCommaSeparated,
	promptInput,
	selectUserApiKey,
} from "./shared-utils";

// Generate a random key with crypto.getRandomValues to ensure it's cryptographically secure
function generateKey(length = 32): string {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	); // Hex encoding
}

export async function addUserApiKey(config: APIConfig): Promise<APIConfig> {
	const name = await promptInput("Enter user API key name");
	const key = `sk-${generateKey()}`;

	// Ask for allowed providers
	const allowedProviders = await promptCommaSeparated(
		"Enter allowed provider names (comma-separated, leave empty for all providers)",
	);

	config.userKeys.push({
		name,
		key,
		allowedProviders:
			allowedProviders.length > 0 ? allowedProviders : undefined,
	});

	console.log(`Generated API key: ${key}`);
	if (allowedProviders.length > 0) {
		console.log(`Allowed providers: ${allowedProviders.join(", ")}`);
	} else {
		console.log("All providers are allowed");
	}
	return config;
}

export async function removeUserApiKey(config: APIConfig): Promise<APIConfig> {
	const name = await selectUserApiKey(config);
	const confirmed = await confirmAction(`Remove API key "${name}"?`);

	if (!confirmed) {
		console.log("Removal cancelled.");
		return config;
	}

	config.userKeys = config.userKeys.filter((key) => key.name !== name);
	console.log(`API key "${name}" removed successfully.`);
	return config;
}

export async function viewUserApiKey(config: APIConfig): Promise<void> {
	const name = await selectUserApiKey(config);
	const userKey = config.userKeys.find((key) => key.name === name);

	if (userKey) {
		console.log(`\nKey: ${userKey.key}`);
		if (userKey.allowedProviders && userKey.allowedProviders.length > 0) {
			console.log(`Allowed providers: ${userKey.allowedProviders.join(", ")}`);
		} else {
			console.log("All providers are allowed");
		}
	} else {
		console.error(`API key "${name}" not found.`);
	}
}

export async function rotateUserApiKey(config: APIConfig): Promise<APIConfig> {
	const name = await selectUserApiKey(config);
	const userKey = config.userKeys.find((key) => key.name === name);

	if (userKey) {
		const confirmed = await confirmAction(`Rotate API key "${name}"?`);
		if (!confirmed) {
			console.log("Rotation cancelled.");
			return config;
		}

		userKey.key = `sk-${generateKey()}`;
		console.log(`New API key for "${name}": ${userKey.key}`);
	} else {
		console.error(`API key "${name}" not found.`);
	}
	return config;
}
