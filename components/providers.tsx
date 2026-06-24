"use client";

import { ThemeProvider } from "./theme";

// Theme wraps the whole app (incl. /login). The data store (MosProvider) is
// mounted only inside the authenticated (app) group so the login route isn't
// blocked by the workspace load.
export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
