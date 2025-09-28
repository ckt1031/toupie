import {
	getAuth,
	initOidcAuthMiddleware,
	type OidcAuth,
	type OidcAuthEnv,
	oidcAuthMiddleware,
	processOAuthCallback,
	revokeSession,
} from "@hono/oidc-auth";
import { Hono } from "hono";
import apiConfig from "../../../data/api.json";
import home from "./Home";
import userKeys from "./UserKeys";

export type DashboardEnv = {
	Variables: {
		auth: OidcAuth;
	};
};

const app = new Hono<DashboardEnv>();

// We don't need to worry about "apiConfig.dashboard" issue
// Since without apiConfig.dashboard this app router will not be loaded

const OIDC_CONFIG: Partial<OidcAuthEnv> = {
	OIDC_ISSUER: apiConfig.dashboard.oauth2.issuer,
	OIDC_CLIENT_ID: apiConfig.dashboard.oauth2.clientId,
	OIDC_CLIENT_SECRET: apiConfig.dashboard.oauth2.clientSecret,
	OIDC_AUTH_SECRET: apiConfig.dashboard.oauth2.authSecret, // Generate via `openssl rand -hex 32`
	OIDC_REDIRECT_URI: `/dashboard/callback`,
};

app.use(initOidcAuthMiddleware(OIDC_CONFIG));

app.get("/logout", async (c) => {
	await revokeSession(c);
	return c.text("You have been successfully logged out!");
});
app.get("/callback", async (c) => {
	return processOAuthCallback(c);
});

app.use(oidcAuthMiddleware());

app.use(async (c, next) => {
	const auth = await getAuth(c);

	if (!auth || !auth.email) {
		return c.redirect("/dashboard/login");
	}

	c.set("auth", auth);

	// Check if the email is allowed
	if (
		!apiConfig.dashboard.oauth2.allowedEmails.includes(auth.email.toString())
	) {
		await revokeSession(c);
		return c.text("You are not allowed to access this dashboard", 403);
	}

	await next();
});

app.route("/", home);
app.route("/keys", userKeys);

export default app;
