"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AtSign,
  Heart,
  Info,
  Camera,
  Lock,
  MessageCircle,
  Plus,
  RotateCw,
  Trash2,
  Users,
} from "lucide-react";
import { useMos } from "@/lib/store";
import type { SocialSnapshot } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
} from "@/components/ui";
import { AreaTrend } from "@/components/charts";
import { cn, formatNumber, formatCompact } from "@/lib/utils";

/* --------------------------------------------------------------- Stat card */

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "muted",
  hint,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  tone?: string;
  hint?: string;
}) {
  const toneColor: Record<string, string> = {
    danger: "text-danger bg-danger/10",
    warning: "text-warning bg-warning/10",
    success: "text-success bg-success/10",
    info: "text-info bg-info/10",
    primary: "text-primary bg-primary/10",
    muted: "text-muted-foreground bg-muted",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", toneColor[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

/* ----------------------------------------------------------------- Helpers */

function fmt1(n: number) {
  return n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
}

/** Signed delta hint like "+120" / "−3". Returns null when no delta to show. */
function deltaHint(curr: number, prev: number | undefined) {
  if (prev === undefined) return undefined;
  const d = Math.round((curr - prev) * 10) / 10;
  if (d === 0) return "Sin cambios vs. medición anterior";
  const sign = d > 0 ? "+" : "−";
  return `${sign}${fmt1(Math.abs(d))} vs. medición anterior`;
}

/** Map an API snapshot (could be snake_case or camelCase) into Partial<SocialSnapshot>. */
function mapApiSnapshot(raw: Record<string, unknown>): Partial<SocialSnapshot> {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null) return raw[k];
    }
    return undefined;
  };
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
  return {
    platform: (pick("platform") as string) ?? "instagram",
    handle: (pick("handle") as string) ?? "merquellantas_sas",
    capturedAt: (pick("capturedAt", "captured_at") as string) ?? new Date().toISOString(),
    followers: num(pick("followers")),
    posts: num(pick("posts")),
    avgLikes: num(pick("avgLikes", "avg_likes")),
    avgComments: num(pick("avgComments", "avg_comments")),
    engagementRate: num(pick("engagementRate", "engagement_rate")),
    source: "instagram",
  };
}

/* -------------------------------------------------------------------- Page */

export default function OnlinePage() {
  const { isAdmin, data, addSocialSnapshot, deleteSocialSnapshot } = useMos();
  const [recordOpen, setRecordOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [banner, setBanner] = useState<
    { kind: "success" | "info" | "error"; text: string } | null
  >(null);

  // Ascending by capturedAt for trends; latest = current stats.
  const sorted = useMemo(
    () =>
      [...data.socialSnapshots].sort((a, b) =>
        a.capturedAt < b.capturedAt ? -1 : a.capturedAt > b.capturedAt ? 1 : 0,
      ),
    [data.socialSnapshots],
  );

  const latest = sorted[sorted.length - 1];
  const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : undefined;

  const followersTrend = useMemo(
    () =>
      sorted.map((s) => ({
        label: format(new Date(s.capturedAt), "d MMM", { locale: es }),
        value: s.followers,
      })),
    [sorted],
  );
  const likesTrend = useMemo(
    () =>
      sorted.map((s) => ({
        label: format(new Date(s.capturedAt), "d MMM", { locale: es }),
        value: s.avgLikes,
      })),
    [sorted],
  );

  async function syncInstagram() {
    setSyncing(true);
    setBanner(null);
    try {
      const res = await fetch("/api/social/instagram", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        snapshot?: Record<string, unknown>;
        needsSetup?: boolean;
        help?: string;
        error?: string;
      };
      if (res.ok && body.ok) {
        if (body.snapshot) addSocialSnapshot(mapApiSnapshot(body.snapshot));
        setBanner({
          kind: "success",
          text: "Medición actualizada desde Instagram correctamente.",
        });
      } else if (res.status === 400 && body.needsSetup) {
        setBanner({
          kind: "info",
          text:
            body.help ??
            "La cuenta de Instagram aún no está conectada. Configura la integración para sincronizar automáticamente.",
        });
      } else {
        setBanner({
          kind: "error",
          text:
            body.error ??
            "No se pudo actualizar desde Instagram. Inténtalo de nuevo en unos minutos.",
        });
      }
    } catch {
      setBanner({
        kind: "error",
        text: "No se pudo conectar con Instagram. Revisa tu conexión e inténtalo de nuevo.",
      });
    } finally {
      setSyncing(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Online"
          description="Reputación y crecimiento en redes — @merquellantas_sas en Instagram."
        />
        <EmptyState
          icon={<Lock className="h-5 w-5" />}
          title="Solo administradores"
          description="El portal Online está restringido a administradores. Cambia a un usuario administrador desde el menú del avatar en la esquina superior derecha para gestionar las mediciones."
        />
      </div>
    );
  }

  const empty = sorted.length === 0;
  const bannerTone: Record<string, string> = {
    success: "border-success/30 bg-success/10 text-success",
    info: "border-info/30 bg-info/10 text-info",
    error: "border-danger/30 bg-danger/10 text-danger",
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Online"
        description="Reputación y crecimiento en redes — @merquellantas_sas en Instagram."
        actions={
          <>
            <Button onClick={syncInstagram} disabled={syncing}>
              <RotateCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              {syncing ? "Actualizando…" : "Actualizar desde Instagram"}
            </Button>
            <Button variant="outline" onClick={() => setRecordOpen(true)}>
              <Plus className="h-4 w-4" />
              Registrar medición
            </Button>
          </>
        }
      />

      {banner && (
        <div
          className={cn(
            "mb-6 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm",
            bannerTone[banner.kind],
          )}
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{banner.text}</span>
        </div>
      )}

      {empty ? (
        <EmptyState
          icon={<Camera className="h-5 w-5" />}
          title="Aún no hay mediciones"
          description="Empieza a monitorear la reputación de la marca en Instagram. Puedes registrar una medición manualmente (seguidores, publicaciones, likes y comentarios) o conectar Instagram para sincronizar las métricas automáticamente."
          action={
            <div className="flex items-center gap-2">
              <Button onClick={syncInstagram} disabled={syncing}>
                <RotateCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                {syncing ? "Actualizando…" : "Actualizar desde Instagram"}
              </Button>
              <Button variant="outline" onClick={() => setRecordOpen(true)}>
                <Plus className="h-4 w-4" />
                Registrar medición
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Seguidores"
              value={formatNumber(latest.followers)}
              icon={Users}
              tone="primary"
              hint={prev && deltaHint(latest.followers, prev.followers)}
            />
            <StatCard
              label="Publicaciones"
              value={formatNumber(latest.posts)}
              icon={Camera}
              tone="info"
              hint={prev && deltaHint(latest.posts, prev.posts)}
            />
            <StatCard
              label="Likes por publicación"
              value={formatNumber(Math.round(latest.avgLikes))}
              icon={Heart}
              tone="danger"
              hint={prev && deltaHint(latest.avgLikes, prev.avgLikes)}
            />
            <StatCard
              label="Engagement"
              value={`${fmt1(latest.engagementRate)}%`}
              icon={MessageCircle}
              tone="success"
              hint={prev && deltaHint(latest.engagementRate, prev.engagementRate)}
            />
          </div>

          {/* Trend charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <div className="border-b border-border px-5 py-3.5">
                <h2 className="text-sm font-semibold">Seguidores en el tiempo</h2>
              </div>
              <div className="p-5">
                {sorted.length < 2 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Registra al menos 2 mediciones para ver tendencias.
                  </p>
                ) : (
                  <AreaTrend data={followersTrend} height={220} />
                )}
              </div>
            </Card>
            <Card>
              <div className="border-b border-border px-5 py-3.5">
                <h2 className="text-sm font-semibold">Likes por publicación en el tiempo</h2>
              </div>
              <div className="p-5">
                {sorted.length < 2 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Registra al menos 2 mediciones para ver tendencias.
                  </p>
                ) : (
                  <AreaTrend data={likesTrend} height={220} color="var(--danger)" />
                )}
              </div>
            </Card>
          </div>

          {/* History table */}
          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-semibold">
                Historial de mediciones
                <span className="ml-2 font-normal text-muted-foreground">
                  · {sorted.length} {sorted.length === 1 ? "medición" : "mediciones"}
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Fecha</th>
                    <th className="px-4 py-2.5 text-right font-medium">Seguidores</th>
                    <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
                      Publicaciones
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">Likes/post</th>
                    <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">
                      Coment./post
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">Engagement %</th>
                    <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Origen</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {[...sorted].reverse().map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-medium">
                        {format(new Date(s.capturedAt), "d MMM yyyy, HH:mm", { locale: es })}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatNumber(s.followers)}
                      </td>
                      <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">
                        {formatNumber(s.posts)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCompact(s.avgLikes)}
                      </td>
                      <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">
                        {formatCompact(s.avgComments)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt1(s.engagementRate)}%</td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        {s.source === "instagram" ? (
                          <Badge tone="info">Instagram</Badge>
                        ) : (
                          <Badge tone="muted">Manual</Badge>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button
                          onClick={() => deleteSocialSnapshot(s.id)}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                          aria-label="Eliminar medición"
                          title="Eliminar medición"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <RecordModal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSave={(input) => {
          addSocialSnapshot(input);
          setRecordOpen(false);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------- Registrar medición */

function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function RecordModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: Partial<SocialSnapshot>) => void;
}) {
  const [followers, setFollowers] = useState("0");
  const [posts, setPosts] = useState("0");
  const [avgLikes, setAvgLikes] = useState("0");
  const [avgComments, setAvgComments] = useState("0");
  const [date, setDate] = useState(localNow());

  const save = () => {
    const f = Number(followers) || 0;
    const p = Number(posts) || 0;
    const likes = Number(avgLikes) || 0;
    const comments = Number(avgComments) || 0;
    const engagementRate = f ? Math.round(((likes + comments) / f) * 1000) / 10 : 0;
    onSave({
      platform: "instagram",
      handle: "merquellantas_sas",
      capturedAt: new Date(date || localNow()).toISOString(),
      followers: f,
      posts: p,
      avgLikes: likes,
      avgComments: comments,
      engagementRate,
      source: "manual",
    });
    // Reset for next time.
    setFollowers("0");
    setPosts("0");
    setAvgLikes("0");
    setAvgComments("0");
    setDate(localNow());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar medición"
      description="Captura manualmente las métricas de @merquellantas_sas en Instagram."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>Guardar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm text-muted-foreground">
          <AtSign className="h-4 w-4" />
          <span className="font-medium text-foreground">merquellantas_sas</span>
          <span>· Instagram</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Seguidores">
            <Input
              type="number"
              min={0}
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
              className="tabular-nums"
              autoFocus
            />
          </Field>
          <Field label="Publicaciones">
            <Input
              type="number"
              min={0}
              value={posts}
              onChange={(e) => setPosts(e.target.value)}
              className="tabular-nums"
            />
          </Field>
          <Field label="Likes por publicación">
            <Input
              type="number"
              min={0}
              value={avgLikes}
              onChange={(e) => setAvgLikes(e.target.value)}
              className="tabular-nums"
            />
          </Field>
          <Field label="Comentarios por publicación">
            <Input
              type="number"
              min={0}
              value={avgComments}
              onChange={(e) => setAvgComments(e.target.value)}
              className="tabular-nums"
            />
          </Field>
        </div>
        <Field label="Fecha">
          <Input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
