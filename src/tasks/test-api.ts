import cliProgress from "cli-progress";
import Table from "cli-table3";
import * as apiConfig from "../../data/api.json";

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

export default async function testAPI() {
	const config: APIConfig = apiConfig as APIConfig;

	const table = new Table({
		head: ["Provider", "Model", "Status", "Response Time (ms)"],
	});

	let totalKeys = 0;
	for (const providerKey in config.providers) {
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
	for (const providerKey in config.providers) {
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

			const requestBody = {
				model: testModel,
				messages: [{ role: "user", content: "Say 1 only" }],
			};

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
