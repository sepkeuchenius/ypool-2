import { redirect, type LoaderFunctionArgs } from "react-router";
import { destroyMicrosoftSession, getMicrosoftSession } from "../server/microsoft-auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if user is logged in with Microsoft
  const microsoftUser = await getMicrosoftSession(request);
  
  if (microsoftUser) {
    // Destroy Microsoft session
    return destroyMicrosoftSession(request);
  }
  
  // Otherwise, handle Kratos logout
  const kratosUrl = process.env.KRATOS_URL || "https://kratos.sep.dev";
  const redirectRes = await fetch(`${kratosUrl}/self-service/logout/browser`, {
    headers: request.headers,
    redirect: "manual",
  });
  
  const location = redirectRes.headers.get("location");
  if (location) {
    return redirect(location);
  }
  
  return redirect("/");
}

