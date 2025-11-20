import { redirect, type LoaderFunctionArgs } from "react-router";
import { getSessionInfo } from "../server/session.server";
import { HOST_URL } from "../utils/constants";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await getSessionInfo(request);
    if (user) {
        return redirect("/");
    }
    const url = new URLSearchParams()
    url.set("return_to", `${HOST_URL}/`)
    const redirect_res = await fetch(`${process.env.KRATOS_URL || "https://kratos.sep.dev"}/self-service/login/browser?${url.toString()}`, {
        headers: request.headers,
        redirect: "manual",
    });
    const redirect_headers = redirect_res.headers;
    return redirect(redirect_headers.get("location") || "/", {
        headers: redirect_headers,
    });
}

