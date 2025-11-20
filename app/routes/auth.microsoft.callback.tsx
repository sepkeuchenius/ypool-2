import { redirect, type LoaderFunctionArgs } from "react-router";
import { handleMicrosoftCallback } from "../server/microsoft-auth.server";
import { ensureUserInDb } from "../server/user";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { user, headers } = await handleMicrosoftCallback(request);
    
    // Ensure Microsoft user exists in database
    await ensureUserInDb(user);
    
    // Redirect to dashboard after successful login
    return redirect("/dashboard", { headers });
  } catch (error) {
    console.error("Microsoft callback error:", error);
    // Redirect to home with error message
    return redirect("/?error=microsoft_auth_failed");
  }
}

