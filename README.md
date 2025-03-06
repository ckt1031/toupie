# LLM Relay API

This is a OpenAI API relay server, which can be used to relay requests to multiple providers.

The project supports serverless deployment on Vercel.

## Installation

```bash
bun install
```

## Usage

```bash
bun run dev
bun run deploy # Deploy to Vercel
```

## File `api.json` Format

Make sure all provider supports OpenAI API format.

```json
{
    "userKeys": [
        {
            "name": "Test",
            "key": "sk-123456" // User key, generated locally
        }
    ],
    "providers": {
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
