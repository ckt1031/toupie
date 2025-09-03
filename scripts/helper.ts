#!/usr/bin/env bun

import { loadApiConfig } from "../src/helpers/api-config";
import { displayMenu } from "../src/helpers/cli-utils";

/**
 * Main CLI helper script for managing API configuration
 */
async function main(): Promise<void> {
	try {
		const initialConfig = await loadApiConfig();
		await displayMenu(initialConfig);
	} catch (error) {
		console.error("Failed to start helper:", error);
		process.exit(1);
	}
}

main();
