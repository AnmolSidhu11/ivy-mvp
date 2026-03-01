import { INTERNAL_MODE } from "./env";
import { toast } from "sonner";

const ALLOWED_HOSTNAMES: string[] = [];

function isRelativeUrl(url: string): boolean {
  return url.startsWith("/") || url.startsWith("#");
}

export function isAllowedUrl(url: string): boolean {
  try {
    if (isRelativeUrl(url)) {
      return true;
    }

    const parsed = new URL(url, "http://localhost");

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return !INTERNAL_MODE;
    }

    if (!INTERNAL_MODE) {
      return true;
    }

    if (ALLOWED_HOSTNAMES.length === 0) {
      return false;
    }

    return ALLOWED_HOSTNAMES.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function safeNavigate(url: string, target: "_self" | "_blank" = "_self"): void {
  if (!isAllowedUrl(url)) {
    if (INTERNAL_MODE) {
      toast.warning("External links are disabled in internal mode.");
    }
    return;
  }

  if (typeof window === "undefined") return;

  if (target === "_blank") {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    window.location.assign(url);
  }
}

