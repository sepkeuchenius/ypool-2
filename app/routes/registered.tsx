import { redirect, type LoaderFunctionArgs } from "react-router";
import { getSessionInfo } from "../server/session.server";
import { HOST_URL } from "../utils/constants";
import { prisma } from "../utils/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await getSessionInfo(request);
    if (!user) {
        return redirect("/login");
    }
    const dbUser = await prisma.user.create({
        data: {
            id: user.id,
            email: user.email,
            name: user.name,
        }
    })
    return redirect("/profile");
}

