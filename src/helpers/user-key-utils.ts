import type { APIConfig } from "../schema";
import { green, red, rl, yellow } from "./cli-utils";

// Generate a random key with crypto.getRandomValues to ensure it's cryptographically secure
function generateKey(length = 32): string {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	); // Hex encoding
}

export async function chooseUserAPIKeyName(config: APIConfig): Promise<string> {
	console.log(green("\nAvailable User API Keys:"));

	config.userKeys.forEach((key, index) => {
		console.log(`${index + 1}\t${key.name}`);
	});

	const choice = await rl.question(yellow("Enter the key number: "));

	const keyIndex = Number.parseInt(choice, 10) - 1;

	return config.userKeys[keyIndex].name;
}

export async function addUserApiKey(config: APIConfig): Promise<APIConfig> {
	const name = await rl.question("Enter user API key name: ");
	const key = `sk-${generateKey()}`;

	// Ask for allowed providers
	const allowedProvidersInput = await rl.question(
		yellow(
			"Enter allowed provider names (comma-separated, leave empty for all providers): ",
		),
	);

	let allowedProviders: string[] | undefined;
	if (allowedProvidersInput.trim()) {
		allowedProviders = allowedProvidersInput
			.split(",")
			.map((p) => p.trim())
			.filter((p) => p.length > 0);
	}

	config.userKeys.push({ name, key, allowedProviders });
	console.log(green(`Generated API key: ${key}`));
	if (allowedProviders && allowedProviders.length > 0) {
		console.log(green(`Allowed providers: ${allowedProviders.join(", ")}`));
	} else {
		console.log(green("All providers are allowed"));
	}
	return config;
}

export async function removeUserApiKey(config: APIConfig): Promise<APIConfig> {
	const name = await chooseUserAPIKeyName(config);
	const confirmation = await rl.question(
		yellow(`Type "confirm" to remove API key "${name}": `),
	);

	if (confirmation.toLowerCase() !== "confirm") {
		console.log(red("Removal cancelled."));
		return config;
	}

	config.userKeys = config.userKeys.filter((key) => key.name !== name);
	console.log(green(`API key "${name}" removed successfully.`));
	return config;
}

export async function viewUserApiKey(config: APIConfig): Promise<void> {
	const name = await chooseUserAPIKeyName(config);
	const userKey = config.userKeys.find((key) => key.name === name);

	if (userKey) {
		console.log(green(`\nAPI key for "${name}": ${userKey.key}`));
		if (userKey.allowedProviders && userKey.allowedProviders.length > 0) {
			console.log(
				green(`Allowed providers: ${userKey.allowedProviders.join(", ")}`),
			);
		} else {
			console.log(green("All providers are allowed"));
		}
	} else {
		console.log(red(`API key "${name}" not found.`));
	}
}
