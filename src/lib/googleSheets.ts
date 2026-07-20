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
    questionFields: [
      "whyJoin",
      "currentlyReading",
      "favoriteGenre",
      "timeZone",
      "phone",
      "state",
      "howHeard",
      "birthday",
      "bookCrackedOpen",
      "readerEnergy",
      "whatDrawsYou",
      "interviewAvailability",
      "bookishSocials",
      "whisper",
    ],
  },
  interview: {
    tab: "Interview",
    // Curated subset (role/workTitle/details/links) plus the newly added
    // interview-logistics fields -- deliberately still not the form's full
    // field list (genres/latestProject/upcomingReleases/whyFeature aren't
    // included), matching the original curation choice.
    questionFields: [
      "role",
      "workTitle",
      "details",
      "links",
      "attendeeCount",
      "datePreferred",
      "authorType",
      "publishingHouseName",
      "needsBookReadPrior",
    ],
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
 * Finds which spreadsheet row (1-indexed, matching the sheet's own row
 * numbers) holds the given application, by scanning the tab's ID column.
 * Returns null if the row was never successfully appended in the first
 * place (e.g. it predates this feature, or the original sync failed) --
 * callers treat that as "nothing to do" rather than an error.
 */
async function findRowForApplication(
  accessToken: string,
  spreadsheetId: string,
  tab: string,
  idColumn: string,
  applicationId: string
): Promise<number | null> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${tab}!${idColumn}2:${idColumn}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    console.error("[googleSheets] Reading ID column failed:", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const ids: string[] = (data.values ?? []).map((r: string[]) => r[0]);
  const rowOffset = ids.findIndex((id) => id === applicationId);
  // Data starts at row 2 (row 1 is headers), and rowOffset is 0-indexed.
  return rowOffset === -1 ? null : rowOffset + 2;
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
    const sheetRow = await findRowForApplication(accessToken, spreadsheetId, config.tab, idColumn, applicationId);
    if (sheetRow === null) {
      console.warn(
        `[googleSheets] No row found for application ${applicationId} on tab "${config.tab}" -- was it ever synced?`
      );
      return;
    }

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

const sheetIdCache = new Map<string, number>();

async function getSheetId(accessToken: string, spreadsheetId: string, tab: string): Promise<number | null> {
  if (sheetIdCache.has(tab)) return sheetIdCache.get(tab)!;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    console.error("[googleSheets] Reading sheet metadata failed:", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const match = (data.sheets ?? []).find((s: { properties: { title: string } }) => s.properties.title === tab);
  if (!match) {
    console.warn(`[googleSheets] No tab named "${tab}" found in the spreadsheet`);
    return null;
  }
  const sheetId = match.properties.sheetId as number;
  sheetIdCache.set(tab, sheetId);
  return sheetId;
}

/**
 * Removes the row for the given application from its tab entirely (not
 * just clearing the cells), so rows below it shift up. Best-effort, same
 * "never block" rule as everywhere else this syncs -- if the row was never
 * synced in the first place, this just logs and does nothing.
 */
export async function deleteApplicationRowFromSheet(applicationId: string, kind: string) {
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

  try {
    const sheetRow = await findRowForApplication(accessToken, spreadsheetId, config.tab, idColumn, applicationId);
    if (sheetRow === null) {
      console.warn(
        `[googleSheets] No row found for application ${applicationId} on tab "${config.tab}" -- nothing to delete`
      );
      return;
    }

    const sheetId = await getSheetId(accessToken, spreadsheetId, config.tab);
    if (sheetId === null) return;

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: sheetRow - 1,
                endIndex: sheetRow,
              },
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[googleSheets] Row delete failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[googleSheets] Row delete threw:", err);
  }
}
