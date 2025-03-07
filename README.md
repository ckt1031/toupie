# LLM Relay API

This is a OpenAI API relay server, which can be used to relay requests to multiple providers.

The project supports serverless deployment on Vercel.

## Installation

```bash
bun install
```

## Usage of API

```bash
bun run dev
bun run deploy # Deploy to Vercel
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
            "key": "sk-123456" // User key, generated locally
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
