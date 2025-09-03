import { confirm, select } from "@inquirer/prompts";
import cliProgress from "cli-progress";
import Table from "cli-table3";
import * as apiConfig from "../../data/api.json";
import type { APIConfig } from "../schema";

type Provider = APIConfig["providers"][string];

async function testAPIFromKey(selectedProviders: Record<string, Provider>) {
	const config = apiConfig as APIConfig;

	const table = new Table({
		head: ["Provider", "Model", "Status", "Response Time (ms)"],
	});

	let totalKeys = 0;
	for (const providerKey in selectedProviders) {
		totalKeys += config.providers[providerKey].keys.length;
	}

	const progressBar = new cliProgress.SingleBar({
		format:
			"Testing API | {bar} | {percentage}% | {providerName} | {value}/{total} Keys",
		barCompleteChar: "\u2588",
		barIncompleteChar: "\u2591",
		hideCursor: true,
	});

	progressBar.start(totalKeys, 0, {
		providerName: "Initializing",
	});

	let currentKey = 0;
	for (const providerKey in selectedProviders) {
		const provider = config.providers[providerKey];

		const testModel = provider.testModel;

		if (!testModel) {
			table.push([provider.name, "No test model found", "N/A", "N/A"]);
			continue;
		}

		const keys = provider.keys;

		if (keys.length === 0) {
			table.push([provider.name, testModel, "No keys found", "N/A"]);
			continue;
		}

		for (const apiKey of keys) {
			const baseURL = provider.baseURL;
			let url = baseURL;

			progressBar.update(++currentKey, { providerName: provider.name });

			/** Chat completion request body */
			let requestBody: Record<string, unknown> = {
				model: testModel,
				messages: [{ role: "user", content: "Say 1 only" }],
			};

			// Check if the model is embedding model
			if (testModel.includes("embed")) {
				requestBody = {
					model: testModel,
					input: "Hello, world!",
				};
			}

			const headers: Record<string, string> = {
				"Content-Type": "application/json",
			};

			if (provider.azure) {
				headers["api-key"] = apiKey as string;
				url += `/openai/deployments/${provider.testModel}/chat/completions`;
				url += `?api-version=${provider.azureAPIVersion}`;
			} else {
				headers.Authorization = `Bearer ${apiKey}`;
				url += "/chat/completions";
			}

			// Replace the path if the model is embedding model
			if (testModel.includes("embed")) {
				url = url.replace("/chat/completions", "/embeddings");
			}

			const startTime = Date.now();
			let status = "Unknown";
			let responseTime = 0;

			try {
				const response = await fetch(url, {
					method: "POST",
					headers: headers,
					body: JSON.stringify(requestBody),
				});

				responseTime = Date.now() - startTime;
				status = `${response.status} ${response.statusText}`;
			} catch (_error) {
				responseTime = Date.now() - startTime;
			}

			const name = `${provider.name} (${keys.indexOf(apiKey)})`;

			table.push([name, testModel, status, responseTime]);
		}
	}

	progressBar.stop();
	console.log(table.toString());
}

async function chooseProviderWithAllOption(
	config: APIConfig,
): Promise<Record<string, Provider>> {
	const providerChoices = Object.entries(config.providers).map(
		([key, provider]) => ({
			name: `${provider.name} (${key})${
				provider.enabled === false ? " (disabled)" : ""
			}`,
			value: key,
		}),
	);

	const allChoice = await confirm({
		message: "Test all enabled providers?",
		default: false,
	});

	if (allChoice) {
		const enabledProviders: Record<string, Provider> = {};
		for (const [key, provider] of Object.entries(config.providers)) {
			if (provider.enabled !== false) {
				enabledProviders[key] = provider;
			}
		}
		return enabledProviders;
	}

	const selectedProvider = await select({
		message: "Select a provider to test:",
		choices: providerChoices,
	});

	return {
		[selectedProvider]: config.providers[selectedProvider],
	};
}

export default async function testAPI() {
	// Choose providers to test
	const selectedProviders = await chooseProviderWithAllOption(
		apiConfig as APIConfig,
	);

	await testAPIFromKey(selectedProviders);
}
