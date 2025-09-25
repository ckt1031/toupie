import { getAuth } from "@hono/oidc-auth";
import { Hono } from "hono";
import { FC } from "hono/jsx";
import apiConfig from "../../../data/api.json";

const app = new Hono();

interface UserKey {
    name: string;
    key: string;
    allowedProviders?: string[];
    allowedModels?: string[];
}

const UserKeysList: FC<{ userKeys: UserKey[] }> = ({ userKeys }) => {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                maxWidth: "800px",
                margin: "0 auto",
                padding: "20px",
                fontFamily: "sans-serif",
            }}
        >
            <h2>User Keys</h2>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "15px",
                }}
            >
                {userKeys.map((userKey, index) => (
                    <div key={index}>
                        <h3
                            style={{
                                margin: "0 0 8px 0",
                                fontSize: "16px",
                                fontWeight: "600",
                            }}
                        >
                            {userKey.name}
                        </h3>
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontFamily: "monospace",
                                    fontSize: "12px",
                                    color: "#666",
                                    backgroundColor: "#fff",
                                    padding: "8px",
                                    borderRadius: "4px",
                                    border: "1px solid #ddd",
                                    wordBreak: "break-all",
                                    lineHeight: "1.4",
                                }}
                            >
                                {userKey.key}
                            </div>
                            {(userKey.allowedProviders || userKey.allowedModels) && (
                                <div
                                    style={{
                                        marginTop: "8px",
                                        fontSize: "12px",
                                        color: "#888",
                                    }}
                                >
                                    {userKey.allowedProviders && (
                                        <div>
                                            <strong>Allowed Providers:</strong>{" "}
                                            {userKey.allowedProviders.join(", ")}
                                        </div>
                                    )}
                                    {userKey.allowedModels && (
                                        <div>
                                            <strong>Allowed Models:</strong>{" "}
                                            {userKey.allowedModels.join(", ")}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: "20px" }}>
                <a href="/dashboard">Back to Dashboard</a>
            </div>
        </div>
    );
};

app.get("/", async (c) => {
    const auth = await getAuth(c);

    if (!auth || !auth.email) {
        return c.redirect("/dashboard/login");
    }

    return c.html(<UserKeysList userKeys={apiConfig.userKeys} />);
});

export default app;
