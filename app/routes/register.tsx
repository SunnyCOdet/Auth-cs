import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { dbConnection } from "~/db/db.server";
import { hashPassword, createUserSession, getUserFromSession } from "~/utils/auth.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import type { User } from "~/types";

export const meta: MetaFunction = () => {
  return [{ title: "Register" }];
};

// Redirect if already logged in
export async function loader({ request }: LoaderFunctionArgs) {
    const user = await getUserFromSession(request);
    if (user) {
        return redirect("/dashboard");
    }
    return json({});
}


export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const username = formData.get("username");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  const errors: Record<string, string> = {};

  if (typeof email !== "string" || !email.includes("@")) {
    errors.email = "Invalid email address";
  }
  if (typeof username !== "string" || username.length < 3) {
    errors.username = "Username must be at least 3 characters long";
  }
  if (typeof password !== "string" || password.length < 6) {
    errors.password = "Password must be at least 6 characters long";
  }
  if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  try {
    // Check if email or username already exists
    const existingUserStmt = dbConnection.prepare(
      'SELECT id FROM users WHERE email = ? OR username = ?'
    );
    const existingUser = existingUserStmt.get(email, username);

    if (existingUser) {
      // Be generic to avoid leaking which field exists
      errors.form = "An account with this email or username already exists.";
      return json({ errors }, { status: 400 });
    }

    const passwordHash = await hashPassword(password as string);

    const insertStmt = dbConnection.prepare(
      'INSERT INTO users (email, username, passwordHash) VALUES (?, ?, ?)'
    );
    const info = insertStmt.run(email, username, passwordHash);
    const userId = info.lastInsertRowid as number;

    // TODO: Generate a default license key upon registration?
    // const licenseKey = crypto.randomBytes(16).toString('hex'); // Example key
    // const licenseStmt = dbConnection.prepare('INSERT INTO license_keys (userId, licenseKey) VALUES (?, ?)');
    // licenseStmt.run(userId, licenseKey);

    return createUserSession(userId, username as string, "/dashboard");

  } catch (error) {
    console.error("Registration error:", error);
    errors.form = "An unexpected error occurred. Please try again.";
    return json({ errors }, { status: 500 });
  }
}

export default function Register() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Create your account
        </h2>
        <Form method="post" className="space-y-4">
          <Input
            label="Email"
            type="email"
            name="email"
            required
            error={actionData?.errors?.email}
          />
          <Input
            label="Username"
            type="text"
            name="username"
            required
            error={actionData?.errors?.username}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            required
            error={actionData?.errors?.password}
          />
          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            required
            error={actionData?.errors?.confirmPassword}
          />

          {actionData?.errors?.form && (
            <p className="text-sm text-red-600 dark:text-red-400">{actionData.errors.form}</p>
          )}

          <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? "Registering..." : "Register"}
          </Button>
        </Form>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-500">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
