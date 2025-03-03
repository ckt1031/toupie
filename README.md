# LLM Relay API

## api.json Format

Make sure all provider supports OpenAI API format.

```json
{
    "userKeys": [
        {
            "name": "Test",
            "key": "sk-123456" // User key
        }
    ],
    "providers": {
        "google-genai": {
            "name": "Google GenAI",
            "baseURL": "https://generativelanguage.googleapis.com/v1beta/openai",
            "models": [
                {
                    "request": "gpt-4o-mini", // Model name from request to be casted
                    "destination": "openai/gpt-4o-mini" // Model name sent to provider
                },
                "gemini-1.5-flash-latest", // Direct model name, without casting
            ],
            "keys": [
                "AIzaSyB1234567890" // Provider key, which sends requests to the provider
            ]
        }
    }
}
```