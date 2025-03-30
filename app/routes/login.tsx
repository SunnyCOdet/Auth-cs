import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation, useSearchParams } from "@remix-run/react";
import { dbConnection } from "~/db/db.server";
import { comparePassword, createUserSession, getUserFromSession } from "~/utils/auth.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import type { User } from "~/types";

export const meta: MetaFunction = () => {
  return [{ title: "Login" }];
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
  const usernameOrEmail = formData.get("usernameOrEmail");
  const password = formData.get("password");
  const redirectTo = formData.get("redirectTo") || "/dashboard";

  const errors: Record<string, string> = {};

  if (typeof usernameOrEmail !== "string" || usernameOrEmail.length === 0) {
    errors.usernameOrEmail = "Username or Email is required";
  }
  if (typeof password !== "string" || password.length === 0) {
    errors.password = "Password is required";
  }
   if (typeof redirectTo !== "string") {
     errors.form = "Invalid redirect path";
   }


  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  try {
    const stmt = dbConnection.prepare(
      'SELECT id, username, passwordHash FROM users WHERE email = ? OR username = ?'
    );
    const user = stmt.get(usernameOrEmail, usernameOrEmail) as User | undefined;

    if (!user || !user.passwordHash) {
      errors.form = "Invalid username/email or password.";
      return json({ errors }, { status: 401 });
    }

    const isPasswordValid = await comparePassword(password as string, user.passwordHash);

    if (!isPasswordValid) {
      errors.form = "Invalid username/email or password.";
      return json({ errors }, { status: 401 });
    }

    return createUserSession(user.id, user.username, redirectTo);

  } catch (error) {
    console.error("Login error:", error);
    errors.form = "An unexpected error occurred. Please try again.";
    return json({ errors }, { status: 500 });
  }
}


export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Log in to your account
        </h2>
        <Form method="post" className="space-y-4">
           <input
            type="hidden"
            name="redirectTo"
            value={searchParams.get("redirectTo") ?? "/dashboard"}
          />
          <Input
            label="Username or Email"
            type="text" // Can be email or username
            name="usernameOrEmail"
            required
            error={actionData?.errors?.usernameOrEmail}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            required
            error={actionData?.errors?.password}
          />

           <div className="flex items-center justify-between">
             {/* Optional: Remember me checkbox */}
             <div className="text-sm">
               <Link
                 to="/forgot-password"
                 className="font-medium text-blue-600 hover:underline dark:text-blue-500"
               >
                 Forgot your password?
               </Link>
             </div>
           </div>


          {actionData?.errors?.form && (
            <p className="text-sm text-red-600 dark:text-red-400">{actionData.errors.form}</p>
          )}

          <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log in"}
          </Button>
        </Form>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:underline dark:text-blue-500">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
