import apiConfig from "../data/api.json";

interface Model {
    id: string;
    object: string;
    created: number;
    owned_by: string;
}

export function handleModelListRequest() {
    const list: Model[] = []

    for (const provider of Object.values(apiConfig.providers)) {
        for (const model of provider.models) {
            const modelId = typeof model === "string" ? model : model.request;

            // Check if there is the same model in the list
            const existingModel = list.find((m) => m.id === modelId);

            if (existingModel) continue;

            // Reject if embed is in modelId
            if (modelId.includes("embed")) continue;

            list.push({
                id: modelId,
                object: "model",
                created: 1686935002,
                owned_by: "LLM",
            });
        }
    }

    const data = {
        object: "list",
        data: list,
    }

    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }

    return new Response(JSON.stringify(data), { headers });
}

/**
 * Randomly pick a provider for the model based on the model id
 */
export function pickModelChannel(modelId: string) {
    const providers = Object.values(apiConfig.providers).filter(
        (provider) => provider.models.some((m) => {
            if (typeof m === "string") return m === modelId;

            return m.request === modelId;
        })
    );

    if (providers.length === 0) return null;

    // Randomly pick a provider from the filtered list
    const randomIndex = Math.floor(Math.random() * providers.length);
    const provider = providers[randomIndex];

    // Random pick a key from the provider
    const randomKeyIndex = Math.floor(Math.random() * provider.keys.length);
    const key = provider.keys[randomKeyIndex];

    // Handle model request
    const model = provider.models.find((m) => {
        if (typeof m === "string") return m === modelId;

        return m.request === modelId;
    });

    if (!model) return null;

    return {
        provider: {
            name: provider.name,
            model: typeof model === "string" ? model : model.destination,
            baseURL: provider.baseURL,
        },
        key,
    }
}