import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getUserFromSession } from "~/utils/auth.server";

import "./tailwind.css";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

// Load user session data globally if needed
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request);
  return json({ user });
}


export function Layout({ children }: { children: React.ReactNode }) {
  // const { user } = useLoaderData<typeof loader>(); // Get user data if needed for layout

  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-gray-50 dark:bg-gray-950">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// Optional: Add a global error boundary
export function ErrorBoundary() {
  // const error = useRouteError();
  // console.error(error); // Log error
  return (
     <html lang="en" className="h-full">
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
       <body className="h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
         <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Something went wrong</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
                We encountered an unexpected error. Please try again later.
            </p>
            {/* You could provide more details in dev mode */}
            {/* {isRouteErrorResponse(error) ? <p>{error.status} {error.statusText}</p> : error instanceof Error ? <p>{error.message}</p> : <p>Unknown Error</p>} */}
            <Link to="/" className="text-blue-600 hover:underline dark:text-blue-500">Go back home</Link>
         </div>
        <Scripts />
      </body>
    </html>
  );
}
