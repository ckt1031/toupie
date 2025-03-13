import * as fs from "node:fs";
import chalk from "chalk";
import type { APIConfig } from "../schema";

export const apiConfigPath = "./data/api.json";

export async function loadApiConfig(): Promise<APIConfig> {
	try {
		const data = await fs.promises.readFile(apiConfigPath, "utf-8");
		return JSON.parse(data) as APIConfig;
	} catch (error) {
		console.error(chalk.red("Error loading api config:"), error);
		return { userKeys: [], providers: {} };
	}
}

export async function saveApiConfig(config: APIConfig): Promise<void> {
	try {
		await fs.promises.writeFile(
			apiConfigPath,
			JSON.stringify(config, null, 4),
			"utf-8",
		);
	} catch (error) {
		console.error(chalk.red("Error saving api config:"), error);
	}
}
