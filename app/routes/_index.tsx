import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getUserFromSession } from "~/utils/auth.server";

// Redirect index route based on authentication status
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request);
  if (user) {
    return redirect("/dashboard");
  }
  return redirect("/login");
}

// No default export needed as we always redirect
export default function Index() {
    return null;
}
