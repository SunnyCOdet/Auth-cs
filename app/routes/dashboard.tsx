import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData, Link } from "@remix-run/react";
import { requireUser } from "~/utils/auth.server";
import { dbConnection } from "~/db/db.server";
import type { User, LicenseKey } from "~/types";
import { Button } from "~/components/ui/Button";

export const meta: MetaFunction = () => {
  return [{ title: "Dashboard" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request); // Ensures user is logged in

  try {
    const stmt = dbConnection.prepare(
      'SELECT id, licenseKey, isActive, createdAt FROM license_keys WHERE userId = ? ORDER BY createdAt DESC'
    );
    const licenseKeys = stmt.all(user.id) as LicenseKey[];
    return json({ user, licenseKeys });
  } catch (error) {
    console.error("Error fetching license keys:", error);
    // Return user data even if licenses fail to load
    return json({ user, licenseKeys: [], error: "Failed to load license keys." });
  }
}

export default function Dashboard() {
  const { user, licenseKeys, error } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <nav className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="font-bold text-xl">My App</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Welcome, {user.username}!</span>
              <Form action="/logout" method="post">
                <Button type="submit" variant="secondary" size="sm">Logout</Button>
              </Form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Your License Keys</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            {licenseKeys.length > 0 ? (
              <ul className="space-y-3">
                {licenseKeys.map((key) => (
                  <li key={key.id} className="border dark:border-gray-700 p-4 rounded-md flex justify-between items-center">
                    <div>
                      <p className="font-mono text-sm break-all">{key.licenseKey}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Created: {new Date(key.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      key.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {key.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">You don't have any license keys assigned yet.</p>
            )}

            {/* Placeholder for future "Request Key" button */}
            {/* <div className="mt-6">
              <Button>Request New License Key</Button>
            </div> */}
          </div>
        </div>
      </main>
    </div>
  );
}
