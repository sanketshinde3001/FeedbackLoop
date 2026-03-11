/**
 * Client-side Cloudinary video upload with XHR progress tracking.
 * Uses an unsigned upload preset — no API secret is ever sent to the browser.
 *
 * Prerequisites (Cloudinary dashboard):
 *   Settings → Upload → Upload presets → Add upload preset
 *   Set "Signing mode" to "Unsigned", copy the preset name.
 *
 * Required env vars (NEXT_PUBLIC_ = safe for browser):
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset_name
 */
export function uploadVideoToCloudinary(
  blob: Blob,
  onProgress?: (pct: number) => void
): Promise<string | null> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  // Gracefully skip if env vars aren't configured yet
  if (!cloudName || !uploadPreset) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", blob, "feedback.webm");
    formData.append("upload_preset", uploadPreset);
    formData.append("resource_type", "video");

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`
    );

    // Track upload progress (XHR supports this; fetch does not)
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    // 5-minute timeout — generous enough for a 5-min video on a slow connection
    xhr.timeout = 5 * 60 * 1000;

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText) as { secure_url: string };
          resolve(data.secure_url);
        } catch {
          reject(new Error("Unexpected response from upload service."));
        }
      } else {
        reject(new Error("Video upload failed. Please try again."));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.ontimeout = () =>
      reject(new Error("Upload timed out. Check your connection."));

    xhr.send(formData);
  });
}
