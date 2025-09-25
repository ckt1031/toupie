import { getAuth } from "@hono/oidc-auth";
import { Hono } from "hono";
import { FC } from "hono/jsx";

const app = new Hono();

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

app.get('/', async (c) => {
    const auth = await getAuth(c)

    if (!auth || !auth.email) {
        return c.redirect("/dashboard/login")
    }

    return c.html(<BigTitle email={auth.email.toString()} />)
})

export default app;