"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowRight, Boxes, CheckCircle2 } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { hasPassword, setPassword, verifyPassword } from "@/lib/demo-auth";

const FEATURES = [
  "Cada prioridad, proyecto y tarea recurrente en un solo lugar",
  "Seguimiento de carga de trabajo y capacidad del equipo",
  "KPIs, compromisos de reuniones y reportes exportables",
];

// Demo-mode users. In live mode, Supabase Auth manages identities.
const DEMO_USERS: Record<string, string> = {
  "jeronimo.morales@merquellantas.com": "u1",
  "alejandro@merquellantas.com": "u2",
  "andres@merquellantas.com": "u3",
};

// Pre-provisioned accounts (work immediately on any device, no first-time setup).
const SEEDED_CREDENTIALS: Record<string, string> = {
  "jeronimo.morales@merquellantas.com": "JeronimoMorales123",
};

type Mode = "idle" | "signin" | "create" | "unknown";

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
  const live = isSupabaseConfigured();

  const [email, setEmail] = useState("");
  const [password, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recompute the demo flow (create vs sign in) as the email changes.
  useEffect(() => {
    if (live) return;
    const e = email.trim().toLowerCase();
    if (!e.includes("@")) return setMode("idle");
    if (!(e in DEMO_USERS)) return setMode("unknown");
    setMode(SEEDED_CREDENTIALS[e] || hasPassword(e) ? "signin" : "create");
  }, [email, live]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Live mode — authenticate against Supabase.
    if (live) {
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

    // Demo mode — each user manages their own password.
    const key = email.trim().toLowerCase();
    const userId = DEMO_USERS[key];
    if (!userId) {
      setError("No encontramos ese correo. Usa tu correo @merquellantas.com.");
      setLoading(false);
      return;
    }

    const seeded = SEEDED_CREDENTIALS[key];
    if (seeded) {
      // Pre-provisioned account — fixed password.
      if (password !== seeded) {
        setError("Contraseña incorrecta.");
        setLoading(false);
        return;
      }
    } else if (!hasPassword(key)) {
      // First time — create a password.
      if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        setLoading(false);
        return;
      }
      if (password !== confirm) {
        setError("Las contraseñas no coinciden.");
        setLoading(false);
        return;
      }
      setPassword(key, password);
    } else if (!verifyPassword(key, password)) {
      setError("Contraseña incorrecta.");
      setLoading(false);
      return;
    }

    try {
      window.localStorage.setItem("mos:user:v1", userId);
    } catch {
      /* private mode — store falls back to default user */
    }
    // Full navigation so the data provider re-initializes with this identity.
    window.location.assign(next);
  };

  const creating = !live && mode === "create";
  const buttonLabel = loading
    ? "Entrando…"
    : creating
      ? "Crear contraseña"
      : "Iniciar sesión";

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Panel de marca */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-surface p-12 lg:flex">
        <div className="dotgrid absolute inset-0 opacity-60" />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Merquellantas MOS</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight">
            El sistema operativo de tu departamento de marketing.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Una sola fuente de verdad para 26 tiendas — ejecución, no ruido en redes.
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
        <div className="relative text-xs text-muted-foreground">© {new Date().getFullYear()} · Sistema Operativo de Marketing</div>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold">Merquellantas MOS</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            {creating ? "Crea tu contraseña" : "Hola de nuevo"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {creating
              ? "Es tu primer ingreso: define la contraseña con la que entrarás."
              : "Inicia sesión en tu espacio de trabajo para continuar."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label>Correo de trabajo</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@merquellantas.com"
                autoComplete="email"
              />
            </div>
            <div>
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="••••••••"
                autoComplete={creating ? "new-password" : "current-password"}
              />
            </div>
            {creating && (
              <div>
                <Label>Confirmar contraseña</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            )}
            {mode === "unknown" && (
              <p className="text-xs text-muted-foreground">
                Usa tu correo corporativo <span className="font-medium text-foreground">@merquellantas.com</span>.
              </p>
            )}
            {error && (
              <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {buttonLabel}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
