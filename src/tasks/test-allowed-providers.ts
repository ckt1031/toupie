import apiConfig from "../../data/api.json";
import type { APIConfig } from "../schema";
import { pickModelChannel } from "../utils/pick-model";

// Test the allowedProviders functionality
function testAllowedProviders() {
	console.log("Testing allowedProviders functionality...\n");

	// Test case 1: User key with specific allowed providers
	const restrictedUserKey: APIConfig["userKeys"][number] = {
		name: "Test Restricted",
		key: "sk-test-restricted",
		allowedProviders: ["google", "oh-my-gpt"],
	};

	// Test case 2: User key with no restrictions (all providers allowed)
	const unrestrictedUserKey: APIConfig["userKeys"][number] = {
		name: "Test Unrestricted",
		key: "sk-test-unrestricted",
	};

	// Test case 3: User key with empty allowedProviders (should reject)
	const emptyAllowedUserKey: APIConfig["userKeys"][number] = {
		name: "Test Empty",
		key: "sk-test-empty",
		allowedProviders: [],
	};

	// Test models that exist in the config
	const testModels = ["gemini-2.0-flash", "text-embedding-3-small", "gpt-4.1"];

	console.log("=== Test 1: Restricted User Key ===");
	testModels.forEach((model) => {
		const result = pickModelChannel(model, [], restrictedUserKey);
		if (result) {
			console.log(`✅ Model "${model}" -> Provider: ${result.provider.name}`);
		} else {
			console.log(`❌ Model "${model}" -> No provider found`);
		}
	});

	console.log("\n=== Test 2: Unrestricted User Key ===");
	testModels.forEach((model) => {
		const result = pickModelChannel(model, [], unrestrictedUserKey);
		if (result) {
			console.log(`✅ Model "${model}" -> Provider: ${result.provider.name}`);
		} else {
			console.log(`❌ Model "${model}" -> No provider found`);
		}
	});

	console.log("\n=== Test 3: Empty Allowed Providers ===");
	testModels.forEach((model) => {
		const result = pickModelChannel(model, [], emptyAllowedUserKey);
		if (result) {
			console.log(
				`❌ Model "${model}" -> Provider found (should be rejected): ${result.provider.name}`,
			);
		} else {
			console.log(
				`✅ Model "${model}" -> No provider found (correctly rejected)`,
			);
		}
	});

	console.log("\n=== Test 4: No User Key (Backward Compatibility) ===");
	testModels.forEach((model) => {
		const result = pickModelChannel(model, []);
		if (result) {
			console.log(`✅ Model "${model}" -> Provider: ${result.provider.name}`);
		} else {
			console.log(`❌ Model "${model}" -> No provider found`);
		}
	});

	console.log("\n=== Available Providers in Config ===");
	Object.keys(apiConfig.providers).forEach((providerKey) => {
		const provider =
			apiConfig.providers[providerKey as keyof typeof apiConfig.providers];
		console.log(`- ${providerKey}: ${provider.name}`);
	});

	console.log("\n=== User Keys in Config ===");
	apiConfig.userKeys.forEach((userKey) => {
		console.log(
			`- ${userKey.name}: ${userKey.allowedProviders ? userKey.allowedProviders.join(", ") : "all providers"}`,
		);
	});
}

// Run the test
testAllowedProviders();
