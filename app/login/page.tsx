"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowRight, Boxes, CheckCircle2 } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const FEATURES = [
  "Every priority, project and recurring task in one place",
  "Capacity & workload tracking across the team",
  "KPIs, meeting action items and exportable reports",
];

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("valentina@merqueo-tires.co");
  const [password, setPassword] = useState("demo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Live mode — authenticate against Supabase.
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
      return;
    }

    // Demo mode — no backend required.
    setTimeout(() => router.push(next), 350);
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-surface p-12 lg:flex">
        <div className="dotgrid absolute inset-0 opacity-60" />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Merqueo MOS</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight">
            The operating system for your marketing department.
          </h1>
          <p className="mt-3 text-muted-foreground">
            One source of truth for 26 stores — execution, not social media noise.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-muted-foreground">© {new Date().getFullYear()} Merqueo Tires · Marketing Operating System</div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold">Merqueo MOS</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your workspace to continue.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label>Work email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@merqueo-tires.co" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && (
              <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed border-border bg-surface/50 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Demo mode.</span> No backend required — any
            credentials continue to a fully seeded workspace. Add Supabase keys in <code className="font-mono">.env.local</code> to go live.
          </div>
        </div>
      </div>
    </div>
  );
}
