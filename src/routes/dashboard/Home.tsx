import { Hono } from "hono";
import { FC } from "hono/jsx";
import type { DashboardEnv } from "./index";

const app = new Hono<DashboardEnv>();

const BigTitle: FC<{ email: string }> = ({ email }) => {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px"
        }}>
            <h3>
                Hello {email}!
            </h3>
            <a href="/dashboard/keys">User Keys</a>

            <form action="/dashboard/logout" method="get">
                <button type="submit" style={{ marginTop: "25px" }}>
                    Logout
                </button>
            </form>
        </div>
    )
}

app.get('/', (c) => {
    const auth = c.get("auth");

    if (!auth.email) {
        return c.text("You are not logged in", 401);
    }

    return c.html(<BigTitle email={auth.email.toString()} />)
})

export default app;