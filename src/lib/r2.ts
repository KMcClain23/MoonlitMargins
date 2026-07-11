import { S3Client } from "@aws-sdk/client-s3";

/**
 * R2 is S3-compatible, so the regular AWS SDK works against it -- just
 * point the endpoint at the account-specific R2 URL and use "auto" as
 * the region (R2 ignores region, but the SDK requires the field).
 */
export function r2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    // Path-style (endpoint/bucket/key) instead of virtual-hosted-style
    // (bucket.endpoint/key) -- more reliable DNS resolution against R2,
    // regardless of the bucket's name.
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export function r2PublicUrl(key: string) {
  const base = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
  return `${base}/${key}`;
}
