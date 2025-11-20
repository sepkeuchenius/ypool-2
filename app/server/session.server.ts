import { getMicrosoftSession, type MicrosoftUser } from "./microsoft-auth.server";

export interface User {
  id: string;
  email: string;
  name?: string;
  provider?: "kratos" | "microsoft";
}

export async function getSessionInfo(request: Request): Promise<User | null> {
  // First check Microsoft session (completely separate from Kratos)
  const microsoftUser = await getMicrosoftSession(request);
  if (microsoftUser) {
    return {
      id: microsoftUser.id,
      email: microsoftUser.email,
      name: microsoftUser.name,
      provider: "microsoft",
    };
  }

  // Then check Kratos session
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${process.env.KRATOS_URL || "https://kratos.sep.dev"}/sessions/whoami`, {
    headers: {
      cookie: cookieHeader || "",
    },
    credentials: "include",
  });

  if (res.status !== 200) return null;

  const session = await res.json();
  const user: User = {
    id: session.identity.id,
    email: session.identity.traits.email,
    name: session.identity.traits.name,
    provider: "kratos",
  }
  return user;
}

