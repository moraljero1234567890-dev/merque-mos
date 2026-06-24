import { Shell } from "@/components/shell";
import { MosProvider } from "@/lib/store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MosProvider>
      <Shell>{children}</Shell>
    </MosProvider>
  );
}
