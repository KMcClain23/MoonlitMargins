import { createSign } from "crypto";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}

/**
 * Exchanges the service account's credentials for a short-lived access
 * token, via Google's OAuth2 JWT-bearer flow -- implemented directly with
 * Node's built-in crypto module rather than pulling in googleapis or
 * google-auth-library, since this is the only Google API call this project
 * needs.
 */
async function getAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    console.warn("[googleSheets] Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
    return null;
  }

  // Private keys stored in env vars typically have their real newlines
  // escaped as literal "\n" sequences -- unescape them back to real
  // newlines before use.
  const privateKey = rawKey.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);

  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlEncode(
    JSON.stringify({
      iss: email,
      scope: SHEETS_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  let signature: string;
  try {
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claims}`);
    signer.end();
    signature = signer.sign(privateKey).toString("base64url");
  } catch (err) {
    console.error("[googleSheets] Failed to sign JWT -- private key is likely malformed:", err);
    return null;
  }

  const jwt = `${header}.${claims}.${signature}`;

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!res.ok) {
      console.error("[googleSheets] Token exchange failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    if (typeof data.access_token !== "string") {
      console.error("[googleSheets] Token response had no access_token:", data);
      return null;
    }
    return data.access_token;
  } catch (err) {
    console.error("[googleSheets] Token request threw:", err);
    return null;
  }
}

/**
 * Appends one row to the configured Google Sheet -- lets anyone with the
 * sheet's share link see new applications live, without needing an
 * admin_users login on the actual site. Silently does nothing if the
 * Google Sheets env vars aren't configured (logging a warning either way),
 * so this is fully optional and never blocks an application from saving
 * even if it fails.
 */
export async function appendApplicationRow(row: {
  kind: string;
  fullName: string;
  email: string;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  answers: Record<string, string>;
  submittedAt: string;
}) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.warn("[googleSheets] Missing GOOGLE_SHEETS_SPREADSHEET_ID");
    return;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) return; // getAccessToken already logged why

  const values = [
    [
      row.submittedAt,
      row.kind,
      row.fullName,
      row.email,
      row.instagramHandle ?? "",
      row.tiktokHandle ?? "",
      JSON.stringify(row.answers),
    ],
  ];

  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Applications!A:G:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      }
    );

    if (!res.ok) {
      console.error("[googleSheets] Append failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[googleSheets] Append request threw:", err);
  }
}
