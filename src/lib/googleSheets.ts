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
  const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!rawEmail || !rawKey) {
    console.warn("[googleSheets] Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
    return null;
  }

  // Strip a surrounding pair of double quotes: harmless if absent, but
  // necessary when the value was pasted in verbatim (quotes and all)
  // somewhere that -- unlike a local .env file, which dotenv-style parsers
  // unwrap automatically -- stores env var values completely literally,
  // like Vercel's dashboard/CLI. Without this, stray quote characters
  // corrupt the PEM structure and Node's crypto.sign() rejects it outright.
  const email = rawEmail.replace(/^"|"$/g, "");
  const privateKey = rawKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
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

// Converts a 1-indexed column number to its spreadsheet letter (1 -> A,
// 27 -> AA, etc.) -- lets each tab have a different number of question
// columns without hardcoding a range string per tab.
function columnLetter(n: number): string {
  let result = "";
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    num = Math.floor((num - 1) / 26);
  }
  return result;
}

// One tab per application kind, since Membership/Interview/Collab ask
// completely different questions -- a single shared sheet would mean every
// row has a pile of blank cells for whatever doesn't apply to that kind.
// Every tab shares the same shape: Submitted, Kind, Name, Email, Instagram,
// TikTok, [kind-specific question columns...], Status, ID.
const TAB_CONFIG: Record<string, { tab: string; questionFields: string[] }> = {
  member: {
    tab: "Membership",
    questionFields: ["whyJoin", "currentlyReading", "favoriteGenre", "timeZone"],
  },
  interview: {
    tab: "Interview",
    // The interview form (src/app/interview/page.tsx) only has four fields
    // total -- role, workTitle, pitch, links -- so all of them are here.
    // ("details" doesn't exist on this form; the free-text explanation
    // field is actually named "pitch".)
    questionFields: ["role", "workTitle", "pitch", "links"],
  },
  collab: {
    tab: "Collab",
    questionFields: [
      "websiteUrl",
      "bookTitle",
      "genre",
      "publicationStatus",
      "bookDescription",
      "collabType",
      "whyUs",
      "format",
      "participation",
      "details",
    ],
  },
};

const FIXED_LEADING_COLUMNS = 6; // Submitted, Kind, Name, Email, Instagram, TikTok
const TRAILING_COLUMNS = 2; // Status, ID

/**
 * Appends one row to the appropriate tab (by kind) of the configured Google
 * Sheet -- lets anyone with the sheet's share link see new applications
 * live, without needing an admin_users login on the actual site. Silently
 * does nothing if the Google Sheets env vars aren't configured (logging a
 * warning either way), so this is fully optional and never blocks an
 * application from saving even if it fails.
 */
export async function appendApplicationRow(row: {
  id: string;
  kind: string;
  fullName: string;
  email: string;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  answers: Record<string, string>;
  status: string;
  submittedAt: string;
}) {
  const rawSpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!rawSpreadsheetId) {
    console.warn("[googleSheets] Missing GOOGLE_SHEETS_SPREADSHEET_ID");
    return;
  }
  const spreadsheetId = rawSpreadsheetId.replace(/^"|"$/g, "");

  const config = TAB_CONFIG[row.kind];
  if (!config) {
    console.warn(`[googleSheets] Unknown application kind "${row.kind}" -- no tab configured`);
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
      ...config.questionFields.map((field) => row.answers[field] ?? ""),
      row.status,
      row.id,
    ],
  ];

  const lastColumn = columnLetter(FIXED_LEADING_COLUMNS + config.questionFields.length + TRAILING_COLUMNS);

  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${config.tab}!A:${lastColumn}:append?valueInputOption=USER_ENTERED`,
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

/**
 * Updates the Status cell for an existing row on the tab matching the
 * given kind, found by matching the application's ID against the tab's
 * last column. Best-effort -- if the row was never successfully appended
 * in the first place (e.g. it predates this feature, or the original sync
 * failed), this just logs and does nothing rather than creating a
 * confusing duplicate row.
 */
export async function updateApplicationStatusInSheet(applicationId: string, status: string, kind: string) {
  const rawSpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!rawSpreadsheetId) {
    console.warn("[googleSheets] Missing GOOGLE_SHEETS_SPREADSHEET_ID");
    return;
  }
  const spreadsheetId = rawSpreadsheetId.replace(/^"|"$/g, "");

  const config = TAB_CONFIG[kind];
  if (!config) {
    console.warn(`[googleSheets] Unknown application kind "${kind}" -- no tab configured`);
    return;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) return;

  const idColumn = columnLetter(FIXED_LEADING_COLUMNS + config.questionFields.length + TRAILING_COLUMNS);
  const statusColumn = columnLetter(FIXED_LEADING_COLUMNS + config.questionFields.length + 1);

  try {
    const idColumnRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${config.tab}!${idColumn}2:${idColumn}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!idColumnRes.ok) {
      console.error("[googleSheets] Reading ID column failed:", idColumnRes.status, await idColumnRes.text());
      return;
    }

    const idColumnData = await idColumnRes.json();
    const ids: string[] = (idColumnData.values ?? []).map((r: string[]) => r[0]);
    const rowOffset = ids.findIndex((id) => id === applicationId);

    if (rowOffset === -1) {
      console.warn(
        `[googleSheets] No row found for application ${applicationId} on tab "${config.tab}" -- was it ever synced?`
      );
      return;
    }

    // Data starts at row 2 (row 1 is headers), and rowOffset is 0-indexed.
    const sheetRow = rowOffset + 2;

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${config.tab}!${statusColumn}${sheetRow}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [[status]] }),
      }
    );

    if (!updateRes.ok) {
      console.error("[googleSheets] Status update failed:", updateRes.status, await updateRes.text());
    }
  } catch (err) {
    console.error("[googleSheets] Status update threw:", err);
  }
}
