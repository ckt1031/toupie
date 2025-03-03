import apiConfig from "../data/api.json";

/**
 *  Match keys in Authorization header
 */
export function handleAuth(request: Request): boolean {
    const headers = request.headers;
    const key = headers.get("Authorization")?.replace("Bearer ", "");

    if (!key) return false;

    const keyData = apiConfig.userKeys.find((userKey) => userKey.key === key);

    if (!keyData) return false;

    console.info(`Key request: ${keyData.name}`);

    return true;
}