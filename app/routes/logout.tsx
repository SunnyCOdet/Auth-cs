import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { logout } from "~/utils/auth.server";

// Handle POST request to log out
export async function action({ request }: ActionFunctionArgs) {
  return logout(request);
}

// Redirect GET requests to home or login
export async function loader({ request }: LoaderFunctionArgs) {
  return redirect("/");
}
