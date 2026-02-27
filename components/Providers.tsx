"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { DraftsProvider, VisitsProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DraftsProvider>
      <VisitsProvider>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </VisitsProvider>
    </DraftsProvider>
  );
}

