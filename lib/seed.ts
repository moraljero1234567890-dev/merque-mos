import {
  addDays,
  addHours,
  formatISO,
  startOfDay,
  subDays,
} from "date-fns";
import type {
  Announcement,
  Document,
  Kpi,
  KpiUpdate,
  Meeting,
  MeetingAction,
  MosData,
  Profile,
  Project,
  RecurringTask,
  Task,
  ActivityLog,
  Notification,
} from "./types";

const iso = (d: Date) => formatISO(d, { representation: "complete" });
const dayIso = (d: Date) => formatISO(startOfDay(d), { representation: "date" });

/**
 * Builds the demo dataset relative to "now" so the dashboard always has
 * overdue items, today's work and upcoming deadlines.
 */
export function buildSeed(): MosData {
  const now = new Date();
  const D = (n: number) => dayIso(addDays(now, n));

  const profiles: Profile[] = [
    {
      id: "u1",
      name: "Jerónimo Morales",
      email: "jeronimo@tirepro.com.co",
      role: "admin",
      title: "Head of Marketing",
      department: "Brand",
      weeklyCapacity: 40,
    },
    {
      id: "u2",
      name: "Alejandro",
      email: "alejandro@tirepro.com.co",
      role: "member",
      title: "Customer Experience & CRM Lead",
      department: "CRM",
      weeklyCapacity: 40,
    },
    {
      id: "u3",
      name: "Andrés",
      email: "andres@tirepro.com.co",
      role: "member",
      title: "Content & Digital Lead",
      department: "Content",
      weeklyCapacity: 40,
    },
  ];

  const projects: Project[] = [
    {
      id: "p1",
      name: "Q3 Brand Refresh",
      description:
        "Refresh visual identity across 26 stores: signage, in-store posters, social templates and the brand manual v3.",
      ownerId: "u3",
      status: "active",
      priority: "high",
      startDate: D(-28),
      dueDate: D(24),
      department: "Brand",
      progress: 46,
      createdAt: iso(subDays(now, 30)),
    },
    {
      id: "p2",
      name: "26-Store Local SEO Push",
      description:
        "Optimize Google Business Profiles, local landing pages and review velocity for all 26 store locations.",
      ownerId: "u2",
      status: "active",
      priority: "urgent",
      startDate: D(-14),
      dueDate: D(9),
      department: "Performance",
      progress: 62,
      createdAt: iso(subDays(now, 16)),
    },
    {
      id: "p3",
      name: "Loyalty Program Launch",
      description:
        "Launch the 'Merqueo Millas' loyalty program: CRM segmentation, lifecycle emails and in-store enrollment flow.",
      ownerId: "u2",
      status: "active",
      priority: "high",
      startDate: D(-10),
      dueDate: D(31),
      department: "CRM",
      progress: 33,
      createdAt: iso(subDays(now, 12)),
    },
    {
      id: "p4",
      name: "Summer Tire Promo Campaign",
      description:
        "Multi-channel promo: 2x4 on selected lines, paid social, performance ads and retail activation.",
      ownerId: "u2",
      status: "active",
      priority: "urgent",
      startDate: D(-6),
      dueDate: D(4),
      department: "Performance",
      progress: 71,
      createdAt: iso(subDays(now, 8)),
    },
    {
      id: "p5",
      name: "NPS Improvement Program",
      description:
        "Close the loop on detractors, retrain store staff on CX scripts and lift NPS from 41 to 55.",
      ownerId: "u1",
      status: "active",
      priority: "medium",
      startDate: D(-40),
      dueDate: D(50),
      department: "Retail Marketing",
      progress: 28,
      createdAt: iso(subDays(now, 42)),
    },
    {
      id: "p6",
      name: "Website Revamp",
      description:
        "Rebuild the e-commerce front with tire finder by plate, store locator and a faster checkout.",
      ownerId: "u3",
      status: "planning",
      priority: "medium",
      startDate: D(6),
      dueDate: D(80),
      department: "Content",
      progress: 8,
      createdAt: iso(subDays(now, 4)),
    },
    {
      id: "p7",
      name: "Competitor Intelligence Q3",
      description:
        "Quarterly teardown of competitor pricing, promos and content across the 6 main metros.",
      ownerId: "u3",
      status: "on_hold",
      priority: "low",
      startDate: D(-20),
      dueDate: D(20),
      department: "Analytics",
      progress: 18,
      createdAt: iso(subDays(now, 22)),
    },
    {
      id: "p8",
      name: "Holiday Campaign 2025 Wrap-up",
      description:
        "Post-mortem, ROI report and learnings deck for the December campaign.",
      ownerId: "u3",
      status: "completed",
      priority: "low",
      startDate: D(-120),
      dueDate: D(-35),
      department: "Analytics",
      progress: 100,
      createdAt: iso(subDays(now, 130)),
    },
  ];

  const t = (
    id: string,
    title: string,
    assigneeId: string | null,
    projectId: string | null,
    status: Task["status"],
    priority: Task["priority"],
    dueOffset: number | null,
    est: number,
    actual: number,
    extra: Partial<Task> = {},
  ): Task => ({
    id,
    title,
    assigneeId,
    projectId,
    status,
    priority,
    dueDate: dueOffset === null ? null : D(dueOffset),
    estimatedHours: est,
    actualHours: actual,
    attachments: [],
    createdAt: iso(subDays(now, 10)),
    completedAt: status === "done" ? iso(subDays(now, 1)) : null,
    ...extra,
  });

  const tasks: Task[] = [
    t("t1", "Finalize brand manual v3 cover & grid", "u3", "p1", "in_progress", "high", 1, 6, 3.5, {
      description: "Update typographic scale and the new color tokens.",
    }),
    t("t2", "Export store signage kit (26 variants)", "u3", "p1", "todo", "high", 5, 10, 0),
    t("t3", "Social template pack — Instagram & TikTok", "u3", "p1", "in_progress", "medium", 3, 8, 4),
    t("t4", "Audit all 26 Google Business Profiles", "u2", "p2", "in_progress", "urgent", 0, 12, 7, {
      description: "Hours, photos, categories, and Q&A across every location.",
    }),
    t("t5", "Build local landing pages template", "u2", "p2", "waiting", "high", 2, 6, 2, {
      notes: "Blocked: waiting on legal sign-off for store addresses.",
    }),
    t("t6", "Review velocity playbook for store managers", "u2", "p2", "todo", "medium", 6, 4, 0),
    t("t7", "CRM segmentation for loyalty tiers", "u2", "p3", "in_progress", "high", -1, 8, 9.5, {
      description: "Bronze/Silver/Gold thresholds by 12-month spend.",
    }),
    t("t8", "Welcome email lifecycle (3 emails)", "u2", "p3", "todo", "medium", 7, 6, 0),
    t("t9", "In-store enrollment QR flow", "u2", "p3", "backlog", "medium", 14, 5, 0),
    t("t10", "Paid social creatives — Summer Promo", "u3", "p4", "in_progress", "urgent", 0, 8, 5),
    t("t11", "Set up performance ad campaigns", "u2", "p4", "in_progress", "urgent", 1, 6, 3),
    t("t12", "Retail activation kit for stores", "u2", "p4", "todo", "high", 2, 5, 0),
    t("t13", "Detractor close-the-loop SOP", "u1", "p5", "todo", "medium", 4, 4, 0),
    t("t14", "CX script training deck", "u1", "p5", "backlog", "low", 12, 6, 0),
    t("t15", "Website IA & wireframes", "u3", "p6", "backlog", "medium", 18, 12, 0),
    t("t16", "Tire-finder-by-plate spec", "u3", "p6", "backlog", "medium", 20, 8, 0),
    t("t17", "Competitor pricing scrape — 6 metros", "u3", "p7", "waiting", "low", -3, 6, 4, {
      notes: "On hold pending budget approval for the scraping tool.",
    }),
    t("t18", "December ROI report", "u3", "p8", "done", "low", -36, 8, 7.5),
    t("t19", "Holiday learnings deck", "u3", "p8", "done", "low", -35, 5, 6),
    t("t20", "Reply to Q2 detractor reviews backlog", "u2", null, "todo", "high", -1, 3, 0, {
      description: "47 reviews pending response across 9 stores.",
    }),
    t("t21", "Brief Q3 influencer collaboration", "u3", null, "backlog", "low", 9, 2, 0),
    t("t22", "Update media plan spreadsheet", "u2", null, "in_progress", "medium", 0, 2, 1),
  ];

  // Anchor each cadence in the past so occurrences materialize immediately.
  const anchorByFreq: Record<RecurringTask["frequency"], number> = {
    daily: -10,
    weekly: -21,
    biweekly: -28,
    monthly: -45,
    quarterly: -100,
    semiannual: -160,
    yearly: -220,
  };

  // Real recurring catalog. `cadence` preserves the original Spanish cadence
  // label when it was mapped onto the engine's supported frequencies.
  const rc = (
    id: string,
    title: string,
    deliverable: string,
    categoria: string,
    frequency: RecurringTask["frequency"],
    assigneeId: string,
    department: RecurringTask["department"],
    est: number,
    priority: RecurringTask["priority"],
    cadence?: string,
  ): RecurringTask => ({
    id,
    title,
    description: `Entregable: ${deliverable} · Categoría: ${categoria}${
      cadence ? ` · Cadencia: ${cadence}` : ""
    }`,
    frequency,
    assigneeId,
    estimatedHours: est,
    priority,
    department,
    anchorDate: D(anchorByFreq[frequency]),
    active: true,
  });

  const recurring: RecurringTask[] = [
    // Gobierno de Marca
    rc("r1", "Manual de marca corporativo", "Brand Book oficial", "Gobierno de Marca", "semiannual", "u2", "Brand", 16, "high"),
    rc("r2", "Auditoría visual de los 26 puntos de venta", "Scorecard nacional", "Gobierno de Marca", "monthly", "u1", "Brand", 8, "high"),
    rc("r3", "Estandarización de cotizaciones, PDFs, correos y WhatsApp comerciales", "Kit comercial oficial", "Gobierno de Marca", "monthly", "u1", "Brand", 5, "medium"),
    // Customer Journey
    rc("r4", "Mapeo completo del viaje del cliente", "Customer Journey Map", "Customer Journey", "yearly", "u1", "CRM", 20, "high"),
    rc("r5", "Definición de responsables por etapa", "Matriz RACI", "Customer Journey", "yearly", "u1", "CRM", 8, "medium"),
    // CRM y Datos
    rc("r6", "Integración Marketing–CRM", "Dashboard CRM operativo", "CRM y Datos", "monthly", "u1", "CRM", 6, "high"),
    rc("r7", "Análisis de clientes (ticket, recompra, fuga, frecuencia)", "Reporte ejecutivo", "CRM y Datos", "monthly", "u2", "CRM", 5, "medium"),
    rc("r8", "Segmentación de clientes por línea, ciudad y comportamiento", "Segmentos activos", "CRM y Datos", "quarterly", "u2", "CRM", 8, "medium"),
    // Experiencia Cliente
    rc("r9", "Sistema NPS postventa", "Reporte NPS", "Experiencia Cliente", "monthly", "u2", "Retail Marketing", 4, "high"),
    rc("r10", "Encuestas de satisfacción por sucursal", "Ranking nacional", "Experiencia Cliente", "monthly", "u2", "Retail Marketing", 4, "medium"),
    rc("r11", "Programa de reseñas Google", "Reporte de reseñas", "Experiencia Cliente", "monthly", "u3", "Retail Marketing", 3, "medium"),
    rc("r12", "Proceso de seguimiento postventa", "Flujo documentado", "Experiencia Cliente", "monthly", "u2", "Retail Marketing", 4, "medium"),
    rc("r13", "Programa de recompra basado en ciclo de vida de llantas", "Campañas activas", "Experiencia Cliente", "monthly", "u2", "Retail Marketing", 5, "high"),
    // Contenido y Redes
    rc("r14", "Comité mensual de contenido con líderes de línea y regionales", "Acta y parrilla", "Contenido y Redes", "monthly", "u3", "Content", 3, "high"),
    rc("r15", "Planeación de contenido mensual", "Parrilla aprobada", "Contenido y Redes", "monthly", "u3", "Content", 6, "high"),
    rc("r16", "Producción audiovisual y diseño gráfico", "Piezas ejecutadas", "Contenido y Redes", "weekly", "u3", "Content", 8, "medium"),
    rc("r17", "Gestión de LinkedIn corporativo", "Reporte mensual", "Contenido y Redes", "monthly", "u3", "Content", 3, "medium"),
    rc("r18", "Gestión de Meta (Facebook e Instagram)", "Reporte mensual", "Contenido y Redes", "monthly", "u3", "Content", 4, "medium"),
    // Web y Canales Digitales
    rc("r19", "Rediseño estratégico del sitio web", "Nueva estructura web", "Web y Canales Digitales", "quarterly", "u1", "Performance", 24, "high", "Proyecto"),
    rc("r20", "Actualización continua del sitio web", "Sitio actualizado", "Web y Canales Digitales", "monthly", "u3", "Performance", 4, "medium"),
    rc("r21", "Gestión de Google Business Profile para 26 tiendas", "Dashboard de reseñas y tráfico", "Web y Canales Digitales", "monthly", "u2", "Performance", 5, "medium"),
    // Trade Marketing
    rc("r22", "Estandarización de material POP nacional", "Kit POP homologado", "Trade Marketing", "quarterly", "u3", "Retail Marketing", 8, "medium"),
    rc("r23", "Auditoría de ejecución visual en tiendas", "Reporte nacional", "Trade Marketing", "quarterly", "u3", "Retail Marketing", 10, "high"),
    rc("r24", "Activaciones y campañas en punto de venta", "Reporte de resultados", "Trade Marketing", "quarterly", "u2", "Retail Marketing", 8, "medium", "Según calendario"),
    // Eventos y Relaciones
    rc("r25", "Calendario anual de ferias y eventos", "Calendario aprobado", "Eventos y Relaciones", "yearly", "u2", "Retail Marketing", 10, "medium"),
    rc("r26", "Evaluación ROI de eventos y ferias", "Reporte por evento", "Eventos y Relaciones", "quarterly", "u2", "Retail Marketing", 5, "medium", "Posterior al evento"),
    // Proveedores y Cooperación
    rc("r27", "Gestión de co-inversión con proveedores", "Reporte de inversiones", "Proveedores y Cooperación", "monthly", "u2", "Retail Marketing", 4, "medium"),
    rc("r28", "Control de inventario de material promocional", "Inventario actualizado", "Proveedores y Cooperación", "monthly", "u2", "Retail Marketing", 3, "low"),
    // Operación del Área
    rc("r29", "Comité quincenal de marketing", "Acta y seguimiento", "Operación del Área", "biweekly", "u1", "Analytics", 2, "high"),
    rc("r30", "Dashboard único de marketing y experiencia cliente", "Tablero ejecutivo", "Operación del Área", "monthly", "u2", "Analytics", 6, "high"),
    rc("r31", "Presupuesto y ejecución presupuestal", "Reporte financiero", "Operación del Área", "monthly", "u2", "Analytics", 5, "high"),
    rc("r32", "Gestión documental (OneDrive, plantillas, procesos)", "Repositorio actualizado", "Operación del Área", "monthly", "u2", "Analytics", 3, "low", "Continuo"),
    rc("r33", "Manual Operativo del Departamento de Marketing", "Manual oficial", "Operación del Área", "yearly", "u1", "Analytics", 16, "medium"),
    // Customer Experience
    rc("r34", "Estándares de atención para Call Center", "Manual de atención", "Customer Experience", "semiannual", "u2", "Retail Marketing", 10, "medium"),
    rc("r35", "Estándares de atención para vendedores", "Manual comercial", "Customer Experience", "semiannual", "u2", "Retail Marketing", 10, "medium"),
    rc("r36", "Auditoría de experiencia en tiendas (mystery shopper)", "Ranking nacional", "Customer Experience", "quarterly", "u1", "Retail Marketing", 12, "high"),
    rc("r37", "Comunicación de campañas entre Marketing, Comercial y Regionales", "Protocolo de lanzamiento", "Customer Experience", "monthly", "u2", "Retail Marketing", 3, "medium", "Permanente"),
    rc("r38", "Gestión de garantías y comunicación al cliente", "Flujo estandarizado", "Customer Experience", "monthly", "u3", "Retail Marketing", 4, "medium", "Permanente"),
    rc("r39", "Biblioteca nacional de plantillas WhatsApp", "Biblioteca aprobada", "Customer Experience", "quarterly", "u1", "Retail Marketing", 6, "low"),
    rc("r40", "Biblioteca nacional de plantillas de cotización", "Plantillas oficiales", "Customer Experience", "quarterly", "u1", "Retail Marketing", 6, "low"),
    rc("r41", "Programa de reputación Google Reviews por tienda", "Ranking por sucursal", "Customer Experience", "monthly", "u1", "Retail Marketing", 4, "medium"),
    rc("r42", "Scorecard nacional de sucursales", "Dashboard comparativo", "Customer Experience", "monthly", "u1", "Retail Marketing", 5, "high"),
  ];

  const meetings: Meeting[] = [
    {
      id: "m1",
      title: "Marketing Committee — Week 25",
      date: iso(subDays(now, 2)),
      attendeeIds: ["u1", "u2", "u3", "u2"],
      agenda:
        "1. Summer promo readiness\n2. Local SEO progress\n3. Loyalty launch date\n4. NPS recovery",
      notes:
        "Summer promo is on track for go-live. SEO audit at 62%. Loyalty needs legal review on T&Cs. NPS dropped 2pts in 3 stores — action owners assigned.",
      decisions: [
        "Go-live for Summer Promo confirmed for this Friday.",
        "Loyalty launch moved one week to allow legal review.",
      ],
      createdAt: iso(subDays(now, 2)),
    },
    {
      id: "m2",
      title: "Brand Refresh Working Session",
      date: iso(subDays(now, 6)),
      attendeeIds: ["u1", "u3", "u3"],
      agenda: "Review brand manual v3 draft and signage system.",
      notes: "Approved typographic scale. Signage needs a high-contrast variant for older stores.",
      decisions: ["Adopt the new color tokens.", "Add a high-contrast signage variant."],
      createdAt: iso(subDays(now, 6)),
    },
  ];

  const meetingActions: MeetingAction[] = [
    {
      id: "ma1",
      meetingId: "m1",
      description: "Get legal sign-off on loyalty T&Cs",
      assigneeId: "u2",
      dueDate: D(3),
      taskId: null,
    },
    {
      id: "ma2",
      meetingId: "m1",
      description: "Brief 3 low-NPS stores on recovery plan",
      assigneeId: "u2",
      dueDate: D(2),
      taskId: null,
    },
    {
      id: "ma3",
      meetingId: "m2",
      description: "Produce high-contrast signage variant",
      assigneeId: "u3",
      dueDate: D(5),
      taskId: null,
    },
  ];

  const documents: Document[] = [
    { id: "d_brand", name: "Brand", type: "folder", parentId: null, ownerId: "u3", updatedAt: iso(subDays(now, 3)) },
    { id: "d_play", name: "Playbooks", type: "folder", parentId: null, ownerId: "u1", updatedAt: iso(subDays(now, 5)) },
    { id: "d_tmpl", name: "Templates", type: "folder", parentId: null, ownerId: "u3", updatedAt: iso(subDays(now, 1)) },
    { id: "d_sop", name: "SOPs", type: "folder", parentId: null, ownerId: "u1", updatedAt: iso(subDays(now, 8)) },
    { id: "d_rep", name: "Reports", type: "folder", parentId: null, ownerId: "u3", updatedAt: iso(subDays(now, 2)) },

    { id: "f1", name: "Brand Manual v3.pdf", type: "file", parentId: "d_brand", fileKind: "pdf", ownerId: "u3", size: 8_400_000, updatedAt: iso(subDays(now, 3)) },
    { id: "f2", name: "Logo Kit.zip", type: "file", parentId: "d_brand", fileKind: "image", ownerId: "u3", size: 24_000_000, updatedAt: iso(subDays(now, 9)) },
    { id: "f3", name: "Marketing Playbook.doc", type: "file", parentId: "d_play", fileKind: "doc", ownerId: "u1", size: 1_200_000, updatedAt: iso(subDays(now, 5)) },
    { id: "f4", name: "Social Templates.slide", type: "file", parentId: "d_tmpl", fileKind: "slide", ownerId: "u3", size: 3_100_000, updatedAt: iso(subDays(now, 1)) },
    { id: "f5", name: "Campaign Brief Template.doc", type: "file", parentId: "d_tmpl", fileKind: "doc", ownerId: "u3", size: 240_000, updatedAt: iso(subDays(now, 12)) },
    { id: "f6", name: "Review Response SOP.doc", type: "file", parentId: "d_sop", fileKind: "doc", ownerId: "u2", size: 180_000, updatedAt: iso(subDays(now, 8)) },
    { id: "f7", name: "NPS — May 2026.sheet", type: "file", parentId: "d_rep", fileKind: "sheet", ownerId: "u3", size: 540_000, updatedAt: iso(subDays(now, 2)) },
    { id: "f8", name: "Media Plan 2026.sheet", type: "file", parentId: "d_rep", fileKind: "sheet", ownerId: "u2", size: 760_000, updatedAt: iso(subDays(now, 4)) },
  ];

  const kpis: Kpi[] = [
    { id: "k1", name: "Monthly Reach", category: "marketing", ownerId: "u3", target: 2_000_000, current: 1_640_000, unit: "people", direction: "up", updatedAt: iso(subDays(now, 1)) },
    { id: "k2", name: "Engagement Rate", category: "marketing", ownerId: "u3", target: 4.5, current: 3.8, unit: "%", direction: "up", updatedAt: iso(subDays(now, 1)) },
    { id: "k3", name: "Followers", category: "marketing", ownerId: "u3", target: 180_000, current: 162_400, unit: "", direction: "up", updatedAt: iso(subDays(now, 1)) },
    { id: "k4", name: "Qualified Leads", category: "marketing", ownerId: "u2", target: 1_200, current: 980, unit: "/mo", direction: "up", updatedAt: iso(subDays(now, 1)) },
    { id: "k5", name: "NPS", category: "cx", ownerId: "u1", target: 55, current: 41, unit: "", direction: "up", updatedAt: iso(subDays(now, 2)) },
    { id: "k6", name: "Google Reviews Avg", category: "cx", ownerId: "u2", target: 4.6, current: 4.3, unit: "★", direction: "up", updatedAt: iso(subDays(now, 1)) },
    { id: "k7", name: "Open Complaints", category: "cx", ownerId: "u2", target: 20, current: 34, unit: "", direction: "down", updatedAt: iso(subDays(now, 1)) },
    { id: "k8", name: "Project Completion Rate", category: "operations", ownerId: "u1", target: 90, current: 78, unit: "%", direction: "up", updatedAt: iso(subDays(now, 1)) },
    { id: "k9", name: "On-time Delivery", category: "operations", ownerId: "u1", target: 95, current: 86, unit: "%", direction: "up", updatedAt: iso(subDays(now, 1)) },
  ];

  // 6 months of trend per KPI.
  const kpiUpdates: KpiUpdate[] = [];
  kpis.forEach((k) => {
    for (let i = 6; i >= 0; i--) {
      const drift = (k.target - k.current) * (i / 9);
      const noise = ((i * 37 + k.id.charCodeAt(1)) % 7) / 100;
      const base = k.direction === "up" ? k.current - drift : k.current + drift;
      const val = Math.max(0, base * (1 + (noise - 0.03)));
      kpiUpdates.push({
        id: `${k.id}_h${i}`,
        kpiId: k.id,
        value: Math.round(val * 100) / 100,
        date: dayIso(subDays(now, i * 30)),
      });
    }
  });

  const announcements: Announcement[] = [
    {
      id: "a1",
      authorId: "u1",
      title: "Summer Promo goes live Friday 🎯",
      body: "All assets are locked. Store kits ship Thursday. Let's make this our best summer yet — questions to Mateo.",
      pinned: true,
      createdAt: iso(subDays(now, 1)),
    },
    {
      id: "a2",
      authorId: "u1",
      title: "Brand Manual v3 is in review",
      body: "Luciana shared the v3 draft. Please leave comments by EOD Wednesday.",
      pinned: false,
      createdAt: iso(subDays(now, 3)),
    },
  ];

  const activity: ActivityLog[] = [
    { id: "ac1", actorId: "u2", action: "updated", entityType: "task", entityId: "t4", summary: "moved “Audit Google Business Profiles” to In Progress", createdAt: iso(addHours(now, -2)) },
    { id: "ac2", actorId: "u3", action: "commented", entityType: "task", entityId: "t1", summary: "commented on “Finalize brand manual v3”", createdAt: iso(addHours(now, -5)) },
    { id: "ac3", actorId: "u2", action: "completed", entityType: "task", entityId: "t7", summary: "is close to finishing CRM segmentation", createdAt: iso(addHours(now, -8)) },
    { id: "ac4", actorId: "u1", action: "created", entityType: "announcement", entityId: "a1", summary: "posted “Summer Promo goes live Friday”", createdAt: iso(subDays(now, 1)) },
    { id: "ac5", actorId: "u3", action: "updated", entityType: "kpi", entityId: "k5", summary: "updated NPS to 41", createdAt: iso(subDays(now, 2)) },
  ];

  const notifications: Notification[] = [
    { id: "n1", userId: "u1", title: "Task due today", body: "“Reply to Q2 detractor reviews backlog” is overdue.", href: "/tasks", read: false, createdAt: iso(addHours(now, -3)) },
    { id: "n2", userId: "u1", title: "Mentioned in a comment", body: "Luciana mentioned you on the Brand Manual task.", href: "/tasks", read: false, createdAt: iso(addHours(now, -5)) },
    { id: "n3", userId: "u1", title: "KPI at risk", body: "NPS is 14 points below target.", href: "/kpis", read: true, createdAt: iso(subDays(now, 1)) },
  ];

  return {
    profiles,
    projects,
    tasks,
    comments: [
      { id: "c1", taskId: "t1", authorId: "u1", body: "Looks great — can we bump the body size to 11pt?", createdAt: iso(addHours(now, -6)) },
      { id: "c2", taskId: "t1", authorId: "u3", body: "Done, pushing the export now.", createdAt: iso(addHours(now, -5)) },
    ],
    recurring,
    meetings,
    meetingActions,
    documents,
    kpis,
    kpiUpdates,
    announcements,
    activity,
    notifications,
  };
}
