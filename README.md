# Toupie

Toupie (French for "spinning top" or, in a more technical sense, "router" or "turntable") is an LLM Relay API server with OpenAI API format.

## Target Users and Use Cases

The API uses just **one JSON file stored on the server** - no database, no dashboard, and no visual API‑key manager. This keeps routing simple on a server‑less platform.

If you need a UI or more advanced features, you should go with OpenRouter with BYOK (Bring Your Own Key), the [New API](https://github.com/QuantumNous/new-api), or the [LiteLLM Proxy](https://github.com/BerriAI/liteLLM-proxy).

## Installation

```bash
bun install
```

## Usage of API

```bash
bun run dev
bun run deploy
```

### Chat Completion

```bash
curl -X POST https://YOUR_DOMAIN/v1/chat/completions \
-H "Content-Type: application/json" \
-d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello, how are you?"}]}'
```

## CLI Tool (`helper.ts`)

This helper tool helps manage the `api.json` configuration file, allowing you to add user API keys, add providers, add keys to existing providers, add models to existing providers, and modify provider settings.

### Usage

To run the helper tool, use the following command:

```bash
bun run helper
```

This will start an interactive menu in your terminal, guiding you through the available options:

1. **Add User API Key**: Generates and adds a new user API key to the configuration.
2. **Add Provider**: Adds a new provider to the configuration, prompting for the provider's name, base URL, models, and keys.
3. **Add Key to Existing Provider**: Adds a new API key to an existing provider.
4. **Add Model to Existing Provider**: Adds a new model to an existing provider.
5. **Modify Provider Settings**: Modifies the settings of an existing provider, such as the name, base URL, and Azure-specific settings.

## File `api.json` Format

Make sure all provider supports OpenAI API format.

The file is located in `./data/api.json`, make sure to create it if it doesn't exist, and keep it secure.

```json
{
    "userKeys": [
        {
            "name": "Test",
            "key": "sk-123456", // User key, generated locally
            "allowedProviders": [ // Optional, if not provided, all providers are allowed
                "google-genai" // Only allow Google GenAI provider
            ],
            "allowedModels": [ // Optional, if not provided, all models are allowed
                "gpt-4o-mini", "gemini-1.5-flash-latest"
            ]
        }
    ],
    "providers": {
        // Azure
        "azure": {
            "name": "Azure OpenAI",
            "azure": true, // Required for Azure providers
            "azureAPIVersion": "2024-10-21", // Azure API version
            "baseURL": "https://azure-openai.azure-api.net/v1",
            "models": ["gpt-4o", "gpt-4o-mini"],
            "keys": ["123456"]
        },
        // Google provider
        "google-genai": {
            "name": "Google GenAI",
            "baseURL": "https://generativelanguage.googleapis.com/v1beta/openai",
            "models": [
                // 2 Types: Object (Need casting), String (Direct)
                {
                    "request": "gpt-4o-mini", // Model name from request to be casted
                    "destination": "openai/gpt-4o-mini" // Model name sent to provider
                },
                "gemini-1.5-flash-latest", // Direct model name, without casting
            ],
            "keys": [
                // User provided
                "AIzaSyB1234567890" // Provider key, which sends requests to the provider
            ]
        }
    }
}
```
