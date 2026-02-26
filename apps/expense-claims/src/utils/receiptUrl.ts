import type { ADLSConfig, ReceiptInfo } from "../types";

function blobUrl(config: ADLSConfig, path: string): string {
  const [base, qs] = config.sasBaseUrl.split("?");
  const cleanBase = base.replace(/\/$/, "");
  const container = config.containerName.replace(/^\//, "").replace(/\/$/, "");
  const prefix = (config.prefix || "").replace(/^\//, "").replace(/\/$/, "");
  const fullPath = prefix ? `${prefix}/${path}` : path;
  const pathPart = `${cleanBase}/${container}/${fullPath}`;
  return qs ? `${pathPart}?${qs}` : pathPart;
}

/** Returns a URL for receipt preview: mockUrl, or ADLS blob URL when blobPath and config are set. */
export function getReceiptPreviewUrl(
  receipt: ReceiptInfo | null,
  adlsConfig: ADLSConfig | null
): string | null {
  if (!receipt) return null;
  if (receipt.mockUrl) return receipt.mockUrl;
  if (receipt.blobPath && adlsConfig?.sasBaseUrl && adlsConfig?.containerName) {
    return blobUrl(adlsConfig, receipt.blobPath);
  }
  return null;
}
