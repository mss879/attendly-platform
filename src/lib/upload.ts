import "server-only";

/**
 * Shared validation for user file uploads (payment slips, event banners).
 * The stored content type is derived from the file *content* (magic bytes),
 * never from the client-supplied MIME type or filename — a renamed or
 * mislabelled file can otherwise be stored as e.g. text/html and served
 * as a page from the storage domain.
 */

export type UploadExt = "jpg" | "png" | "webp" | "pdf";

const EXT_TO_MIME: Record<UploadExt, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

/** Identify the real file type from its leading bytes. */
function sniffExt(bytes: Buffer): UploadExt | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("latin1", 0, 4) === "RIFF" &&
    bytes.toString("latin1", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  if (bytes.length >= 4 && bytes.toString("latin1", 0, 4) === "%PDF") {
    return "pdf";
  }
  return null;
}

export interface UploadOptions {
  allowedExts: readonly UploadExt[];
  maxBytes: number;
  /** Route-specific copy for the "wrong file type" error. */
  typeError: string;
  /** Route-specific copy for the "wrong size" error. */
  sizeError: string;
}

export type UploadResult =
  | { ok: true; ext: UploadExt; contentType: string; bytes: Buffer }
  | { ok: false; error: string };

export async function validateUpload(
  file: File,
  { allowedExts, maxBytes, typeError, sizeError }: UploadOptions
): Promise<UploadResult> {
  if (file.size === 0 || file.size > maxBytes) {
    return { ok: false, error: sizeError };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = sniffExt(bytes);
  if (!ext || !allowedExts.includes(ext)) {
    return { ok: false, error: typeError };
  }

  return { ok: true, ext, contentType: EXT_TO_MIME[ext], bytes };
}
