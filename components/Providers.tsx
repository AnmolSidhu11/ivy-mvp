"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { DraftsProvider, VisitsProvider, NotesRepoProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DraftsProvider>
      <VisitsProvider>
        <NotesRepoProvider>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </NotesRepoProvider>
      </VisitsProvider>
    </DraftsProvider>
  );
}

