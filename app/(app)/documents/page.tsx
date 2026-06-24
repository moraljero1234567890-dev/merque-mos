"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ChevronRight,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Image as ImageIcon,
  LayoutGrid,
  Link as LinkIcon,
  List,
  MonitorPlay,
  Search,
  Table2,
  Trash2,
  Upload,
} from "lucide-react";
import { useMos } from "@/lib/store";
import type { Document } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
} from "@/components/ui";
import { cn } from "@/lib/utils";

type View = "grid" | "list";
type FileKind = NonNullable<Document["fileKind"]>;

function formatBytes(n?: number): string {
  if (!n || n <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const rounded = v >= 100 || i === 0 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${rounded} ${units[i]}`;
}

const FILE_KINDS: { value: FileKind; label: string }[] = [
  { value: "doc", label: "Document" },
  { value: "sheet", label: "Spreadsheet" },
  { value: "pdf", label: "PDF" },
  { value: "image", label: "Image" },
  { value: "slide", label: "Slides" },
  { value: "link", label: "Link" },
];

type KindVisual = { icon: typeof FileText; color: string; tint: string; label: string };

function kindVisual(doc: Document): KindVisual {
  if (doc.type === "folder") {
    return { icon: Folder, color: "var(--primary)", tint: "bg-primary/10", label: "Folder" };
  }
  switch (doc.fileKind) {
    case "pdf":
      return { icon: FileText, color: "var(--danger)", tint: "bg-danger/10", label: "PDF" };
    case "sheet":
      return { icon: Table2, color: "var(--success)", tint: "bg-success/10", label: "Spreadsheet" };
    case "image":
      return { icon: ImageIcon, color: "var(--info)", tint: "bg-info/10", label: "Image" };
    case "slide":
      return { icon: MonitorPlay, color: "var(--warning)", tint: "bg-warning/10", label: "Slides" };
    case "link":
      return { icon: LinkIcon, color: "var(--muted-foreground)", tint: "bg-muted", label: "Link" };
    case "doc":
    default:
      return { icon: FileText, color: "var(--info)", tint: "bg-info/10", label: "Document" };
  }
}

export default function DocumentsPage() {
  const { data, me } = useMos();
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [view, setView] = useState<View>("grid");
  const [q, setQ] = useState("");
  const [composer, setComposer] = useState<{ open: boolean; type: Document["type"] }>({
    open: false,
    type: "folder",
  });

  const owner = (id: string) => data.profiles.find((p) => p.id === id);
  const childCount = (id: string) => data.documents.filter((d) => d.parentId === id).length;

  const searching = q.trim().length > 0;

  const items = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = searching
      ? data.documents.filter((d) => d.name.toLowerCase().includes(ql))
      : data.documents.filter((d) => d.parentId === currentFolder);
    return [...list].sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [data.documents, q, currentFolder, searching]);

  const breadcrumbs = useMemo(() => {
    const chain: Document[] = [];
    let cursor = currentFolder;
    const byId = new Map(data.documents.map((d) => [d.id, d]));
    while (cursor) {
      const node = byId.get(cursor);
      if (!node) break;
      chain.unshift(node);
      cursor = node.parentId;
    }
    return chain;
  }, [currentFolder, data.documents]);

  const openItem = (doc: Document) => {
    if (doc.type === "folder") {
      setQ("");
      setCurrentFolder(doc.id);
    } else if (doc.url) {
      window.open(doc.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Documents"
        description="Brand manuals, playbooks, templates, SOPs and reports — one shelf for the team."
        actions={
          <>
            <Button variant="outline" onClick={() => setComposer({ open: true, type: "folder" })}>
              <FolderPlus className="h-4 w-4" />
              New folder
            </Button>
            <Button onClick={() => setComposer({ open: true, type: "file" })}>
              <Upload className="h-4 w-4" />
              Add file
            </Button>
          </>
        }
      />

      {/* Breadcrumbs */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto text-sm">
        <button
          onClick={() => {
            setQ("");
            setCurrentFolder(null);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium transition-colors hover:bg-muted",
            currentFolder === null ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <FolderOpen className="h-4 w-4" />
          Home
        </button>
        {breadcrumbs.map((node, i) => {
          const last = i === breadcrumbs.length - 1;
          return (
            <span key={node.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <button
                onClick={() => {
                  setQ("");
                  setCurrentFolder(node.id);
                }}
                className={cn(
                  "max-w-[180px] truncate rounded-md px-2 py-1 font-medium transition-colors hover:bg-muted",
                  last ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {node.name}
              </button>
            </span>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search all documents…"
            className="pl-9"
          />
        </div>
        <div className="inline-flex shrink-0 rounded-lg border border-border bg-card p-0.5">
          <button
            onClick={() => setView("grid")}
            className={cn(
              "rounded-md p-1.5",
              view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "rounded-md p-1.5",
              view === "list" ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {searching && (
        <p className="mb-3 text-xs text-muted-foreground">
          {items.length} result{items.length === 1 ? "" : "s"} for “{q.trim()}”
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-5 w-5" />}
          title={searching ? "No matches" : "This folder is empty"}
          description={
            searching
              ? "Try a different name or clear the search."
              : "Create a folder or add a file to start filling this shelf."
          }
          action={
            !searching && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setComposer({ open: true, type: "folder" })}>
                  <FolderPlus className="h-4 w-4" />
                  New folder
                </Button>
                <Button onClick={() => setComposer({ open: true, type: "file" })}>
                  <FilePlus className="h-4 w-4" />
                  Add file
                </Button>
              </div>
            )
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((doc) => (
            <GridCard
              key={doc.id}
              doc={doc}
              ownerName={owner(doc.ownerId)?.name}
              count={doc.type === "folder" ? childCount(doc.id) : undefined}
              onOpen={() => openItem(doc)}
            />
          ))}
        </div>
      ) : (
        <ListView
          items={items}
          ownerName={(id) => owner(id)?.name}
          count={(id) => childCount(id)}
          onOpen={openItem}
        />
      )}

      <CreateModal
        open={composer.open}
        type={composer.type}
        parentId={currentFolder}
        onClose={() => setComposer((c) => ({ ...c, open: false }))}
        defaultOwnerName={me.name}
      />
    </div>
  );
}

function MetaLine({ ownerName, doc }: { ownerName?: string; doc: Document }) {
  const parts = [
    ownerName?.split(" ")[0],
    format(new Date(doc.updatedAt), "MMM d"),
    doc.type === "file" ? formatBytes(doc.size) : undefined,
  ].filter(Boolean);
  return <span className="truncate">{parts.join(" · ")}</span>;
}

function GridCard({
  doc,
  ownerName,
  count,
  onOpen,
}: {
  doc: Document;
  ownerName?: string;
  count?: number;
  onOpen: () => void;
}) {
  const { deleteDocument } = useMos();
  const v = kindVisual(doc);
  const Icon = v.icon;

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      className={cn(
        "group relative flex cursor-pointer flex-col rounded-xl border border-border bg-card p-3.5 text-left shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] transition-all hover:border-border-strong hover:shadow-md",
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteDocument(doc.id);
        }}
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
        aria-label={`Delete ${doc.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", v.tint)}>
        <Icon className="h-5 w-5" style={{ color: v.color }} />
      </div>

      <div className="mt-3 truncate text-sm font-semibold leading-snug" title={doc.name}>
        {doc.name}
      </div>
      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        {doc.type === "folder" ? (
          <span>
            {count} item{count === 1 ? "" : "s"}
          </span>
        ) : (
          <MetaLine ownerName={ownerName} doc={doc} />
        )}
      </div>
    </div>
  );
}

function ListView({
  items,
  ownerName,
  count,
  onOpen,
}: {
  items: Document[];
  ownerName: (id: string) => string | undefined;
  count: (id: string) => number;
  onOpen: (doc: Document) => void;
}) {
  const { deleteDocument } = useMos();
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Kind</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Owner</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Updated</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Size</th>
              <th className="w-10 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {items.map((doc) => {
              const v = kindVisual(doc);
              const Icon = v.icon;
              const oName = ownerName(doc.ownerId);
              return (
                <tr
                  key={doc.id}
                  onClick={() => onOpen(doc)}
                  className="group cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", v.tint)}>
                        <Icon className="h-4 w-4" style={{ color: v.color }} />
                      </span>
                      <span className="truncate font-medium" title={doc.name}>
                        {doc.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {doc.type === "folder"
                      ? `Folder · ${count(doc.id)} item${count(doc.id) === 1 ? "" : "s"}`
                      : v.label}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {oName?.split(" ")[0] ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {format(new Date(doc.updatedAt), "MMM d")}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {doc.type === "file" ? formatBytes(doc.size) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDocument(doc.id);
                      }}
                      className="rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                      aria-label={`Delete ${doc.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CreateModal({
  open,
  type,
  parentId,
  onClose,
  defaultOwnerName,
}: {
  open: boolean;
  type: Document["type"];
  parentId: string | null;
  onClose: () => void;
  defaultOwnerName: string;
}) {
  const { createDocument } = useMos();
  const [name, setName] = useState("");
  const [fileKind, setFileKind] = useState<FileKind>("doc");
  const [url, setUrl] = useState("");
  const [size, setSize] = useState("");

  const isFile = type === "file";

  const reset = () => {
    setName("");
    setFileKind("doc");
    setUrl("");
    setSize("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isFile) {
      const parsedSize = Number(size);
      createDocument({
        name: trimmed,
        type: "file",
        parentId,
        fileKind,
        url: url.trim() || undefined,
        size: Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : undefined,
      });
    } else {
      createDocument({ name: trimmed, type: "folder", parentId });
    }
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={isFile ? "Add file" : "New folder"}
      description={
        isFile
          ? "Register a document, sheet, deck, image or link for the team."
          : "Group related files together."
      }
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={save}>{isFile ? "Add file" : "Create folder"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isFile ? "e.g. Brand Guidelines.pdf" : "e.g. Playbooks"}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
        </Field>

        {isFile && (
          <>
            <Field label="Type">
              <Select value={fileKind} onChange={(e) => setFileKind(e.target.value as FileKind)}>
                {FILE_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="URL (optional)">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  type="url"
                />
              </Field>
              <Field label="Size in bytes (optional)">
                <Input
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="e.g. 248000"
                  type="number"
                  min={0}
                />
              </Field>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Will be owned by {defaultOwnerName.split(" ")[0]} and saved to the current folder.
        </p>
      </div>
    </Modal>
  );
}
