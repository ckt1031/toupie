import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { handleProxy, proxyList } from "./routes/proxy";
import v1 from "./routes/v1";

const app = new Hono();

// CORS for all routes
app.use(cors());

// Secure headers for all API routes
app.use(secureHeaders());

// Health check
app.get("/health", (c) => c.json({ message: "OK" }));

// Proxy routes
for (const proxy of proxyList) {
	app.all(`${proxy.path}/*`, (c) => {
		return handleProxy(c, proxy.path, proxy.host);
	});
}

app.route("/v1", v1);

export default app;
