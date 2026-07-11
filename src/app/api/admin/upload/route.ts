import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, r2PublicUrl } from "@/lib/r2";

const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  folder: z.enum(["members", "memories", "events"]),
});

// Only allow real image/video types -- this is a presigned URL for
// arbitrary browser uploads, so the type allowlist matters.
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/-+/g, "-");
}

export async function POST(request: NextRequest) {
  const parsed = uploadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { fileName, fileType, folder } = parsed.data;

  // Member photos stay images-only; memories can be either, since that's
  // where video uploads (event recaps, clips, etc.) actually make sense.
  const allowedTypes =
    folder === "memories" ? [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES] : ALLOWED_IMAGE_TYPES;

  if (!allowedTypes.includes(fileType)) {
    const message =
      folder === "memories"
        ? "Only JPG, PNG, WEBP, GIF images or MP4, WEBM, MOV videos are allowed"
        : "Only JPG, PNG, WEBP, or GIF images are allowed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const key = `${folder}/${randomUUID()}-${sanitizeFileName(fileName)}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(r2Client(), command, { expiresIn: 300 });

  return NextResponse.json({
    uploadUrl,
    publicUrl: r2PublicUrl(key),
  });
}
