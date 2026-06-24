"use client";

import { ThemeProvider } from "./theme";
import { MosProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <MosProvider>{children}</MosProvider>
    </ThemeProvider>
  );
}
