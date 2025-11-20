import { createCookieSessionStorage, redirect } from "react-router";
import { createHash, randomBytes } from "crypto";
import { HOST_URL } from "../utils/constants";
import { jwtDecode } from "jwt-decode";

// Microsoft OAuth configuration
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || "a35fad85-0d90-47ee-a86a-06d675defac5";
const MICROSOFT_CLIENT_SECRET = process.env.MS_password;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || "122860fb-f9c7-4f3c-bcfd-6e55d3679640"; // "common" allows both personal and work accounts
const MICROSOFT_AUTHORITY = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}`;
const MICROSOFT_REDIRECT_URI = `${HOST_URL}/auth/microsoft/callback`;

// Session storage for Microsoft users (separate from Kratos)
const microsoftSessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__microsoft_session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET || "microsoft-session-secret-change-in-production"],
    secure: process.env.NODE_ENV === "production",
  },
});

export interface MicrosoftUser {
  id: string;
  email: string;
  name?: string;
  provider: "microsoft";
}

// Generate PKCE code verifier and challenge
function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function generateState(): string {
  return randomBytes(16).toString("base64url");
}

export async function initiateMicrosoftLogin(request: Request) {
  if (!MICROSOFT_CLIENT_ID) {
    throw new Error("Microsoft OAuth credentials not configured. Please set MICROSOFT_CLIENT_ID environment variable.");
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store code_verifier and state in session for later verification
  const session = await microsoftSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  session.set("code_verifier", codeVerifier);
  session.set("state", state);

  // Build Microsoft OAuth authorization URL
  const authParams = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: MICROSOFT_REDIRECT_URI,
    response_mode: "query",
    scope: "openid email profile User.Read",
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/authorize?${authParams.toString()}`;

  return redirect(authUrl, {
    headers: {
      "Set-Cookie": await microsoftSessionStorage.commitSession(session),
    },
  });
}

export async function handleMicrosoftCallback(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    throw new Error(`Microsoft authentication error: ${error} - ${errorDescription || ""}`);
  }

  if (!code || !state) {
    throw new Error("Missing code or state parameter");
  }

  const session = await microsoftSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const storedState = session.get("state");
  const codeVerifier = session.get("code_verifier");

  if (!storedState || storedState !== state) {
    throw new Error("Invalid state parameter");
  }

  if (!codeVerifier) {
    throw new Error("Missing code verifier in session");
  }

  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    throw new Error("Microsoft OAuth credentials not configured");
  }

  // Exchange authorization code for tokens
  const tokenResponse = await fetch(`${MICROSOFT_AUTHORITY}/oauth2/v2.0/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      code: code,
      redirect_uri: MICROSOFT_REDIRECT_URI,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  const tokens = await tokenResponse.json();
  const accessToken = tokens.access_token;

  if (!accessToken) {
    throw new Error("No access token received from Microsoft");
  }

  console.log("accessToken", accessToken);
  //decode the access token
  console.log("decodedToken", jwtDecode(accessToken));

  // Get user info from Microsoft
  const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userInfoResponse.ok) {
    const errorText = await userInfoResponse.text();
    throw new Error(`Failed to fetch user info: ${errorText}`);
  }

  const userInfo = await userInfoResponse.json();

  // Create Microsoft user object
  const microsoftUser: MicrosoftUser = {
    id: `microsoft_${userInfo.id}`,
    email: userInfo.mail || userInfo.userPrincipalName || "",
    name: userInfo.displayName || userInfo.givenName || undefined,
    provider: "microsoft",
  };

  // Store user in session
  const newSession = await microsoftSessionStorage.getSession();
  newSession.set("user", microsoftUser);

  // Clear the temporary state and code_verifier
  newSession.unset("state");
  newSession.unset("code_verifier");

  return {
    user: microsoftUser,
    headers: {
      "Set-Cookie": await microsoftSessionStorage.commitSession(newSession),
    },
  };
}

export async function getMicrosoftSession(request: Request): Promise<MicrosoftUser | null> {
  const session = await microsoftSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const user = session.get("user");
  return user || null;
}

export async function destroyMicrosoftSession(request: Request) {
  const session = await microsoftSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  return redirect("/", {
    headers: {
      "Set-Cookie": await microsoftSessionStorage.destroySession(session),
    },
  });
}

