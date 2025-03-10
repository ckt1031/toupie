import * as fs from "node:fs";
import chalk from "chalk";
import { z } from "zod";

export const apiConfigPath = "./data/api.json";

export const apiConfigSchema = z.object({
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

export type APIConfig = z.infer<typeof apiConfigSchema>;

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
