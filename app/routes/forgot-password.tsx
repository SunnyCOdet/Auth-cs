import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { dbConnection } from "~/db/db.server";
import { generateResetToken, getUserFromSession } from "~/utils/auth.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import type { User } from "~/types";

export const meta: MetaFunction = () => {
  return [{ title: "Forgot Password" }];
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

  const errors: Record<string, string> = {};
  let message: string | null = null;
  let resetLink: string | null = null; // For demo purposes

  if (typeof email !== "string" || !email.includes("@")) {
    errors.email = "Please enter a valid email address.";
    return json({ errors, message, resetLink }, { status: 400 });
  }

  try {
    const stmt = dbConnection.prepare('SELECT id FROM users WHERE email = ?');
    const user = stmt.get(email) as Pick<User, 'id'> | undefined;

    if (user) {
      const { token, hashedToken } = generateResetToken();
      const expires = new Date(Date.now() + 3600000); // 1 hour expiry

      const updateStmt = dbConnection.prepare(
        'UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?'
      );
      updateStmt.run(hashedToken, expires.toISOString(), user.id);

      // **IMPORTANT:** In a real app, you would email this link.
      // We'll just return it in the response for demonstration in WebContainer.
      const url = new URL(request.url);
      resetLink = `${url.origin}/reset-password/${token}`;
      message = "If an account with that email exists, a password reset link has been generated (check below)."; // Adjusted message

    } else {
      // Still show a generic success message to prevent email enumeration
      message = "If an account with that email exists, a password reset link has been generated.";
    }

    // Return success regardless of whether user exists
    return json({ errors: {}, message, resetLink }, { status: 200 });

  } catch (error) {
    console.error("Forgot password error:", error);
    errors.form = "An unexpected error occurred. Please try again.";
    return json({ errors, message: null, resetLink: null }, { status: 500 });
  }
}

export default function ForgotPassword() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Reset your password
        </h2>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          Enter your email address and we'll send you a link to reset your password (link will appear below for demo).
        </p>
        <Form method="post" className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            name="email"
            required
            error={actionData?.errors?.email}
          />

          {actionData?.errors?.form && (
            <p className="text-sm text-red-600 dark:text-red-400">{actionData.errors.form}</p>
          )}
          {actionData?.message && (
            <p className="text-sm text-green-600 dark:text-green-400">{actionData.message}</p>
          )}
           {/* Display reset link for demo */}
           {actionData?.resetLink && (
             <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-md">
               <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Demo Reset Link:</p>
               <a
                 href={actionData.resetLink}
                 className="text-sm text-blue-600 hover:underline dark:text-blue-400 break-all"
               >
                 {actionData.resetLink}
               </a>
             </div>
           )}

          <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>
        </Form>
         <p className="text-sm text-center text-gray-600 dark:text-gray-400">
           Remembered your password?{' '}
           <Link to="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-500">
             Log in
           </Link>
         </p>
      </div>
    </div>
  );
}
