"use client";

import type { ReactNode } from "react";
import { DraftsProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  return <DraftsProvider>{children}</DraftsProvider>;
}

