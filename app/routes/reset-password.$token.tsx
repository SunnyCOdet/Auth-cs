import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { dbConnection } from "~/db/db.server";
import { hashPassword, hashResetToken } from "~/utils/auth.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import type { User } from "~/types";

export const meta: MetaFunction = () => {
  return [{ title: "Reset Password" }];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { token } = params;
  if (!token) {
    throw redirect("/forgot-password"); // Or show an invalid token message
  }

  const hashedToken = hashResetToken(token);

  try {
    const stmt = dbConnection.prepare(
      'SELECT id FROM users WHERE resetPasswordToken = ? AND resetPasswordExpires > ?'
    );
    const user = stmt.get(hashedToken, new Date().toISOString()) as Pick<User, 'id'> | undefined;

    if (!user) {
      // Token is invalid or expired
      return json({ error: "Invalid or expired password reset token.", tokenIsValid: false });
    }

    return json({ error: null, tokenIsValid: true, token }); // Pass token to form action

  } catch (dbError) {
     console.error("Error validating reset token:", dbError);
     return json({ error: "An error occurred validating the token.", tokenIsValid: false });
  }
}


export async function action({ request, params }: ActionFunctionArgs) {
  const { token } = params;
  const formData = await request.formData();
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  const errors: Record<string, string> = {};

  if (!token) {
      errors.form = "Reset token is missing.";
      return json({ errors, success: false }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 6) {
    errors.password = "Password must be at least 6 characters long";
  }
  if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors, success: false }, { status: 400 });
  }

  const hashedToken = hashResetToken(token);

  try {
    // Verify token again before updating password
    const userStmt = dbConnection.prepare(
      'SELECT id FROM users WHERE resetPasswordToken = ? AND resetPasswordExpires > ?'
    );
    const user = userStmt.get(hashedToken, new Date().toISOString()) as Pick<User, 'id'> | undefined;

    if (!user) {
      errors.form = "Invalid or expired password reset token.";
      return json({ errors, success: false }, { status: 400 });
    }

    const passwordHash = await hashPassword(password as string);

    const updateStmt = dbConnection.prepare(
      'UPDATE users SET passwordHash = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?'
    );
    updateStmt.run(passwordHash, user.id);

    // Optionally log the user in automatically here, or redirect to login
    // For simplicity, redirect to login with a success message
    // TODO: Add flash message support to session.server.ts if needed
    return redirect("/login?reset=success");

  } catch (error) {
    console.error("Reset password error:", error);
    errors.form = "An unexpected error occurred. Please try again.";
    return json({ errors, success: false }, { status: 500 });
  }
}

export default function ResetPassword() {
  const { error: loaderError, tokenIsValid, token } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  if (!tokenIsValid) {
     return (
       <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
         <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800 text-center">
           <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Invalid Token</h2>
           <p className="text-gray-700 dark:text-gray-300">
             {loaderError || "The password reset link is invalid or has expired."}
           </p>
           <Link to="/forgot-password" className="font-medium text-blue-600 hover:underline dark:text-blue-500">
             Request a new link
           </Link>
         </div>
       </div>
     );
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Set a new password
        </h2>
        <Form method="post" className="space-y-4">
           {/* Include token if needed, though it's in URL params */}
           {/* <input type="hidden" name="token" value={token} /> */}
          <Input
            label="New Password"
            type="password"
            name="password"
            required
            error={actionData?.errors?.password}
          />
          <Input
            label="Confirm New Password"
            type="password"
            name="confirmPassword"
            required
            error={actionData?.errors?.confirmPassword}
          />

          {actionData?.errors?.form && (
            <p className="text-sm text-red-600 dark:text-red-400">{actionData.errors.form}</p>
          )}

          <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </Button>
        </Form>
      </div>
    </div>
  );
}
