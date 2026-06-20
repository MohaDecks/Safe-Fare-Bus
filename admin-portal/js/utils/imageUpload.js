/** Max raw file before we resize (600KB — matches backend). */
export const ICON_MAX_BYTES = 600 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

function resizeImageFile(file, maxDim = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      const out = canvas.toDataURL("image/webp", quality);
      const approxBytes = Math.ceil((out.length - out.indexOf(",") - 1) * 0.75);
      if (approxBytes > ICON_MAX_BYTES) {
        resolve(canvas.toDataURL("image/jpeg", 0.75));
        return;
      }
      resolve(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file"));
    };
    img.src = url;
  });
}

/** Compress icon for app-service / provider upload — keeps payload small for server limits. */
export async function prepareIconUpload(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Choose a PNG, JPG, or WebP image");
  }
  if (file.size <= ICON_MAX_BYTES / 4) {
    return readFileAsDataUrl(file);
  }
  return resizeImageFile(file);
}
