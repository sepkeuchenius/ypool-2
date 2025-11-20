import { type LoaderFunctionArgs } from "react-router";
import { initiateMicrosoftLogin } from "../server/microsoft-auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return initiateMicrosoftLogin(request);
}






