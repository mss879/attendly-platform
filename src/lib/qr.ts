import QRCode from "qrcode";

// The QR encodes only the short opaque qr_token (UUID). A small payload keeps
// the QR at a low version (large modules), which scans reliably on phone
// cameras and printed tickets. Error correction Q tolerates ~25% damage.
const QR_OPTIONS = {
  errorCorrectionLevel: "Q" as const,
  width: 600,
  margin: 4,
  color: { dark: "#000000", light: "#FFFFFF" },
};

/** PNG buffer — used for the email attachment. */
export async function qrPngBuffer(qrToken: string): Promise<Buffer> {
  return QRCode.toBuffer(qrToken, { type: "png", ...QR_OPTIONS });
}

/** Data URL — used to render/download the QR on the ticket page. */
export async function qrDataUrl(qrToken: string): Promise<string> {
  return QRCode.toDataURL(qrToken, QR_OPTIONS);
}
