"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Building2,
  Check,
  Info,
  Monitor,
  Moon,
  Palette,
  ShieldAlert,
  Sun,
  User,
  Users,
} from "lucide-react";
import { useMos } from "@/lib/store";
import { useTheme } from "@/components/theme";
import { PageHeader } from "@/components/page-header";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Label,
  Modal,
} from "@/components/ui";
import { cn } from "@/lib/utils";

type SectionId =
  | "profile"
  | "appearance"
  | "notifications"
  | "workspace"
  | "users"
  | "danger";

const SECTIONS: { id: SectionId; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "workspace", label: "Workspace", icon: Building2 },
  { id: "users", label: "Switch user", icon: Users },
  { id: "danger", label: "Danger zone", icon: ShieldAlert },
];

/* ------------------------------------------------------------------ Toggle */

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------- Notification prefs */

const PREF_DEFS: { key: string; label: string; description: string }[] = [
  { key: "taskAssigned", label: "Task assigned", description: "When a task is assigned to you." },
  { key: "mentions", label: "Mentions", description: "When someone @mentions you in a comment." },
  { key: "deadlines", label: "Deadlines approaching", description: "A nudge before a task is due." },
  { key: "kpiAlerts", label: "KPI alerts", description: "When one of your KPIs drifts off target." },
  { key: "weeklyDigest", label: "Weekly digest", description: "A Monday summary of your workload." },
];

const DEFAULT_PREFS: Record<string, boolean> = {
  taskAssigned: true,
  mentions: true,
  deadlines: true,
  kpiAlerts: false,
  weeklyDigest: true,
};

const PREFS_KEY = "mos:prefs";

/* -------------------------------------------------------------------- Page */

export default function SettingsPage() {
  const { data, me, isAdmin, currentUserId, setCurrentUserId, resetDemo } = useMos();
  const { theme, setTheme } = useTheme();

  const [active, setActive] = useState<SectionId>("profile");
  const [resetOpen, setResetOpen] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS);

  // Load persisted notification preferences (cosmetic).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs((p) => ({ ...p, ...(JSON.parse(raw) as Record<string, boolean>) }));
    } catch {
      /* ignore */
    }
  }, []);

  const setPref = (key: string, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const themeTiles = useMemo(
    () =>
      [
        { value: "light" as const, label: "Light", icon: Sun },
        { value: "system" as const, label: "System", icon: Monitor },
        { value: "dark" as const, label: "Dark", icon: Moon },
      ],
    [],
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage your profile, appearance and workspace preferences."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Section nav */}
        <nav className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Panels */}
        <div className="min-w-0 space-y-6">
          {active === "profile" && <ProfilePanel />}
          {active === "appearance" && (
            <AppearancePanel tiles={themeTiles} theme={theme} setTheme={setTheme} />
          )}
          {active === "notifications" && <NotificationsPanel prefs={prefs} setPref={setPref} />}
          {active === "workspace" && (
            <WorkspacePanel teamSize={data.profiles.length} role={me.role} isAdmin={isAdmin} />
          )}
          {active === "users" && (
            <SwitchUserPanel
              profiles={data.profiles}
              currentUserId={currentUserId}
              setCurrentUserId={setCurrentUserId}
            />
          )}
          {active === "danger" && <DangerPanel onReset={() => setResetOpen(true)} />}
        </div>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset demo data"
        description="This restores every project, task, KPI and document to the original seed. Any changes you made in this session will be lost."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetDemo();
                setResetOpen(false);
              }}
            >
              Reset everything
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The workspace will reload its seeded demo content.
          </p>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------- Panel header */

function PanelHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof User;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border px-5 py-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Profile */

function ProfilePanel() {
  const { me } = useMos();
  return (
    <Card>
      <PanelHeader icon={User} title="Profile" description="Your identity across the workspace." />
      <div className="p-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <Avatar id={me.id} name={me.name} size={72} className="text-2xl" />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="text-lg font-semibold tracking-tight">{me.name}</div>
            <div className="text-sm text-muted-foreground">{me.title}</div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge tone="info">{me.department}</Badge>
              <Badge tone={me.role === "admin" ? "primary" : "muted"}>{me.role}</Badge>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={me.name} disabled readOnly />
          </Field>
          <Field label="Email">
            <Input value={me.email} disabled readOnly />
          </Field>
          <Field label="Title">
            <Input value={me.title} disabled readOnly />
          </Field>
          <Field label="Department">
            <Input value={me.department} disabled readOnly />
          </Field>
          <Field label="Weekly capacity">
            <Input value={`${me.weeklyCapacity} hours / week`} disabled readOnly />
          </Field>
          <Field label="Role">
            <Input value={me.role === "admin" ? "Administrator" : "Member"} disabled readOnly />
          </Field>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Profile details are managed by your admin. Contact them to update your name, title or
            capacity.
          </p>
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------- Appearance */

function AppearancePanel({
  tiles,
  theme,
  setTheme,
}: {
  tiles: { value: "light" | "system" | "dark"; label: string; icon: typeof Sun }[];
  theme: string;
  setTheme: (t: "light" | "system" | "dark") => void;
}) {
  return (
    <Card>
      <PanelHeader
        icon={Palette}
        title="Appearance"
        description="Choose how the workspace looks on this device."
      />
      <div className="p-5">
        <Label>Theme</Label>
        <div className="mt-1 grid grid-cols-3 gap-3">
          {tiles.map(({ value, label, icon: Icon }) => {
            const selected = theme === value;
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                aria-pressed={selected}
                className={cn(
                  "group relative flex flex-col items-center gap-2.5 rounded-xl border bg-card px-3 py-5 text-sm font-medium transition-all",
                  selected
                    ? "border-primary text-foreground ring-2 ring-primary/30"
                    : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                    selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                {label}
                {selected && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          System follows your device&apos;s appearance settings automatically.
        </p>
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------- Notifications */

function NotificationsPanel({
  prefs,
  setPref,
}: {
  prefs: Record<string, boolean>;
  setPref: (key: string, value: boolean) => void;
}) {
  return (
    <Card>
      <PanelHeader
        icon={Bell}
        title="Notifications"
        description="Pick what you want to be told about."
      />
      <div className="divide-y divide-border">
        {PREF_DEFS.map((p) => (
          <div key={p.key} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="min-w-0">
              <Label className="mb-0 text-foreground">{p.label}</Label>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </div>
            <Toggle
              checked={prefs[p.key] ?? false}
              onChange={(v) => setPref(p.key, v)}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------- Workspace */

function WorkspacePanel({
  teamSize,
  role,
  isAdmin,
}: {
  teamSize: number;
  role: string;
  isAdmin: boolean;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Workspace name", value: "Merqueo Tires" },
    { label: "Stores", value: "26 stores" },
    { label: "Team size", value: `${teamSize} ${teamSize === 1 ? "member" : "members"}` },
    { label: "Your role", value: role === "admin" ? "Administrator" : "Member" },
  ];
  return (
    <Card>
      <PanelHeader
        icon={Building2}
        title="Workspace"
        description="Details about your marketing operations workspace."
      />
      <div className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <span className="text-sm text-muted-foreground">{r.label}</span>
            <span className="text-sm font-medium">{r.value}</span>
          </div>
        ))}
      </div>
      {isAdmin && (
        <div className="border-t border-border px-5 py-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              You have admin access. Manage team workload, projects and KPIs in the{" "}
              <Link href="/admin" className="font-medium text-primary hover:underline">
                admin console
              </Link>
              .
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ----------------------------------------------------------- Switch user */

function SwitchUserPanel({
  profiles,
  currentUserId,
  setCurrentUserId,
}: {
  profiles: { id: string; name: string; title: string; role: string }[];
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
}) {
  return (
    <Card>
      <PanelHeader
        icon={Users}
        title="Switch user"
        description="Impersonate a teammate to preview their view."
      />
      <div className="border-b border-border px-5 py-2.5">
        <Badge tone="warning">Demo only</Badge>
        <span className="ml-2 text-xs text-muted-foreground">
          This is a sandbox affordance — no real authentication is involved.
        </span>
      </div>
      <div className="divide-y divide-border">
        {profiles.map((p) => {
          const isCurrent = p.id === currentUserId;
          return (
            <button
              key={p.id}
              onClick={() => setCurrentUserId(p.id)}
              className={cn(
                "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors",
                isCurrent ? "bg-muted/40" : "hover:bg-muted/50",
              )}
            >
              <Avatar id={p.id} name={p.name} size={34} />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  {p.role === "admin" && <Badge tone="primary">admin</Badge>}
                </div>
                <div className="truncate text-xs text-muted-foreground">{p.title}</div>
              </div>
              {isCurrent ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Check className="h-4 w-4" />
                  Current
                </span>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">Switch</span>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------- Danger zone */

function DangerPanel({ onReset }: { onReset: () => void }) {
  return (
    <Card className="border-danger/30">
      <PanelHeader
        icon={ShieldAlert}
        title="Danger zone"
        description="Irreversible actions for this workspace."
      />
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-medium">Reset demo data</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Restore all seeded content and discard changes made in this session.
          </p>
        </div>
        <Button variant="danger" onClick={onReset} className="shrink-0">
          <AlertTriangle className="h-4 w-4" />
          Reset demo data
        </Button>
      </div>
    </Card>
  );
}
