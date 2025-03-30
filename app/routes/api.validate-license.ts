import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dbConnection } from "~/db/db.server";
import type { LicenseKey, ApiKey } from "~/types";

// This route should only respond to POST requests for validation
export async function action({ request }: ActionFunctionArgs) {
  // 1. Authenticate the C# application making the request
  const apiKeyHeader = request.headers.get("X-API-Key");
  if (!apiKeyHeader) {
    return json({ valid: false, error: "Missing API Key" }, { status: 401 });
  }

  try {
    // Validate API Key against the database
    const apiKeyStmt = dbConnection.prepare(
      'SELECT id FROM api_keys WHERE apiKey = ? AND isActive = TRUE'
    );
    const validApiKey = apiKeyStmt.get(apiKeyHeader) as Pick<ApiKey, 'id'> | undefined;

    if (!validApiKey) {
      return json({ valid: false, error: "Invalid API Key" }, { status: 401 });
    }

    // 2. Get the license key from the request body
    let requestBody;
    try {
        requestBody = await request.json();
    } catch (e) {
        return json({ valid: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { licenseKey } = requestBody;

    if (!licenseKey || typeof licenseKey !== 'string') {
      return json({ valid: false, error: "Missing or invalid licenseKey in request body" }, { status: 400 });
    }

    // 3. Validate the license key against the database
    const licenseStmt = dbConnection.prepare(
      'SELECT lk.id, lk.isActive, u.username, u.email FROM license_keys lk JOIN users u ON lk.userId = u.id WHERE lk.licenseKey = ?'
    );
    const keyDetails = licenseStmt.get(licenseKey) as (LicenseKey & Pick<User, 'username' | 'email'>) | undefined;

    if (keyDetails && keyDetails.isActive) {
      // Key is valid and active
      return json({
        valid: true,
        username: keyDetails.username, // Optionally return associated user info
        email: keyDetails.email
      }, { status: 200 });
    } else if (keyDetails && !keyDetails.isActive) {
      // Key exists but is inactive
      return json({ valid: false, error: "License key is inactive" }, { status: 403 });
    } else {
      // Key does not exist
      return json({ valid: false, error: "License key not found" }, { status: 404 });
    }

  } catch (error) {
    console.error("API License Validation Error:", error);
    return json({ valid: false, error: "Internal server error during validation" }, { status: 500 });
  }
}

// Optional: Handle GET requests if needed, otherwise they might 404 or 405
// export async function loader() {
//   return json({ message: "POST to this endpoint with licenseKey and X-API-Key header" }, { status: 405 });
// }
