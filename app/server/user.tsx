import { prisma } from "../utils/db.server";
import { getSessionInfo } from "./session.server";
import type { User } from "@prisma/client";

export async function getUser(request: Request): Promise<User | null> {
    const sessionUser = await getSessionInfo(request);
    if (!sessionUser) {
        console.log("No user found in session")
        return null;
    }
    
    const dbUser = await prisma.user.findUnique({
        where: {
            id: sessionUser.id
        }
    })
    if (!dbUser) {
        console.log("No user found in db")
        await ensureUserInDb(sessionUser)
    }
    return dbUser
}


export async function ensureUserInDb(user: { id: string; email: string; name?: string }) {
    const dbUser = await prisma.user.findUnique({
        where: {
            id: user.id
        }
    })
    if (!dbUser) {
        await prisma.user.create({
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
            }
        })
    }
}

