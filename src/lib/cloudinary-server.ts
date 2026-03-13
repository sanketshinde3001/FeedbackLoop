import { createHash } from "crypto";

function getCloudinaryEnv() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}

function signParams(params: Record<string, string>, apiSecret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  return createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}

function sanitizePublicId(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function cloudinaryEncodeForOverlay(publicId: string) {
  return publicId.replace(/\//g, ":");
}

export function getCloudinaryPublicIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = "/upload/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;

    const rest = parsed.pathname.slice(idx + marker.length);
    const parts = rest.split("/");

    if (parts[0]?.startsWith("v") && /^v\d+$/.test(parts[0])) {
      parts.shift();
    }

    if (parts.length === 0) return null;

    const last = parts[parts.length - 1] || "";
    parts[parts.length - 1] = last.replace(/\.[^.]+$/, "");

    return parts.join("/");
  } catch {
    return null;
  }
}

export async function uploadVttToCloudinary(
  vttContent: string,
  basePublicId: string
): Promise<{ secureUrl: string; publicId: string } | null> {
  const env = getCloudinaryEnv();
  if (!env) return null;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const publicId = sanitizePublicId(`feedbackloop/captions/${basePublicId}-captions`);

  const signature = signParams(
    {
      public_id: publicId,
      timestamp,
    },
    env.apiSecret
  );

  const form = new FormData();
  const file = new Blob([vttContent], { type: "text/vtt" });
  form.append("file", file, "captions.vtt");
  form.append("public_id", publicId);
  form.append("api_key", env.apiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${env.cloudName}/raw/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    console.error("[cloudinary] caption upload failed", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as { secure_url?: string; public_id?: string };
  if (!data.secure_url || !data.public_id) return null;

  return { secureUrl: data.secure_url, publicId: data.public_id };
}

export function buildEditedVideoUrl(params: {
  rawVideoPublicId: string;
  captionPublicId: string;
  attendeeName: string;
}): string | null {
  const env = getCloudinaryEnv();
  if (!env) return null;

  const captionIdNoExt = params.captionPublicId.replace(/\.(vtt|srt)$/i, "");
  const encodedCaption = cloudinaryEncodeForOverlay(captionIdNoExt);
  const safeName = encodeURIComponent(params.attendeeName || "Attendee").replace(/%20/g, "+");
  const underline = "_".repeat(Math.max(6, Math.min((params.attendeeName || "Attendee").length + 3, 22)));

  const transformation = [
    "f_auto,q_auto",
    `l_subtitles:${encodedCaption}.vtt,co_white,e_shadow:70`,
    "fl_layer_apply,g_south,y_56",
    `l_text:Arial_24_bold:${safeName},co_rgb:1F2937,e_shadow:55`,
    "fl_layer_apply,g_north_west,x_24,y_20",
    `l_text:Arial_16_bold:${underline},co_rgb:1F2937`,
    "fl_layer_apply,g_north_west,x_24,y_42",
  ].join("/");

  return `https://res.cloudinary.com/${env.cloudName}/video/upload/${transformation}/${params.rawVideoPublicId}.mp4`;
}
