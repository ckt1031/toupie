import cliProgress from "cli-progress";
import Table from "cli-table3";
import * as apiConfig from "../../data/api.json";
import { cyan, rl, yellow } from "../helpers/cli-utils";

interface Provider {
	name: string;

	azure?: boolean;
	azureAPIVersion?: string;

	baseURL: string;
	models: string[] | { request: string; destination: string }[];
	keys: string[];
	testModel?: string;
}

interface APIConfig {
	providers: Record<string, Provider>;
}

async function testAPIFromKey(selectedProviders: Record<string, Provider>) {
	const config: APIConfig = apiConfig as APIConfig;

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
			} catch (error) {
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
	// List providers with numbers
	console.log(cyan("\nAvailable Providers:"));
	const providerList = Object.keys(config.providers);
	providerList.forEach((providerName, index) => {
		console.log(
			`${index + 1}\t${config.providers[providerName].name} (${providerName})`,
		);
	});
	console.log(`${providerList.length + 1}\tAll`);
	const choice = await rl.question(yellow("Enter the option number: "));

	const providerIndex = Number.parseInt(choice) - 1;

	if (providerIndex === providerList.length) {
		return config.providers;
	}

	return {
		[providerList[providerIndex]]:
			config.providers[providerList[providerIndex]],
	};
}

export default async function testAPI() {
	// Choose providers to test
	const selectedProviders = await chooseProviderWithAllOption(apiConfig);

	await testAPIFromKey(selectedProviders);
}
