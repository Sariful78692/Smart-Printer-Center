import crypto from "node:crypto";

function matchesSecret(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function isValidAdminPassword(password) {
  return matchesSecret(password, process.env.ADMIN_DASHBOARD_PASSWORD);
}

export function isAdminRequest(request) {
  return matchesSecret(
    request.cookies.get("smart_print_admin")?.value,
    process.env.ADMIN_SESSION_TOKEN
  );
}

export async function callOrdersSheet(payload) {
  const apiUrl = process.env.GOOGLE_SHEETS_API_URL;
  const apiSecret = process.env.GOOGLE_SHEETS_API_SECRET;

  if (!apiUrl || !apiSecret) {
    throw new Error("Order service configuration is incomplete.");
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, apiSecret }),
    cache: "no-store",
    redirect: "follow",
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Order service request failed.");
  }

  return result;
}
