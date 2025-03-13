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

	const keyIndex = Number.parseInt(choice) - 1;

	return config.userKeys[keyIndex].name;
}

export async function addUserApiKey(config: APIConfig): Promise<APIConfig> {
	const name = await rl.question("Enter user API key name: ");
	const key = `sk-${generateKey()}`;
	config.userKeys.push({ name, key });
	console.log(green(`Generated API key: ${key}`));
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
