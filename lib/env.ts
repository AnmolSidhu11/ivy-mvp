export const INTERNAL_MODE = process.env.NEXT_PUBLIC_INTERNAL_MODE === "true";

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function isInternalMode(): boolean {
  return INTERNAL_MODE;
}

export function isDemoMode(): boolean {
  return DEMO_MODE;
}

