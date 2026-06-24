import { addDays, formatISO, startOfDay } from "date-fns";
import type { MosData, Profile, RecurringTask } from "./types";

const dayIso = (d: Date) => formatISO(startOfDay(d), { representation: "date" });

/**
 * Real workspace seed for Merquellantas Marketing. Contains ONLY the data
 * provided by the team: the three users and the recurring activity catalog.
 * Tasks are materialized from the recurring definitions by the occurrence
 * engine — there is intentionally no fabricated project/task/KPI/meeting data.
 */
export function buildSeed(): MosData {
  const now = new Date();
  const D = (n: number) => dayIso(addDays(now, n));

  const profiles: Profile[] = [
    {
      id: "u1",
      name: "Jerónimo Morales",
      email: "jeronimo.morales@merquellantas.com",
      role: "admin",
      title: "Head of Marketing",
      department: "Brand",
      weeklyCapacity: 40,
    },
    {
      id: "u2",
      name: "Alejandro",
      email: "alejandro@merquellantas.com",
      role: "member",
      title: "Experiencia Cliente & CRM",
      department: "CRM",
      weeklyCapacity: 40,
    },
    {
      id: "u3",
      name: "Andrés",
      email: "andres@merquellantas.com",
      role: "member",
      title: "Contenido & Digital",
      department: "Content",
      weeklyCapacity: 40,
    },
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

  // Real recurring catalog. `support` is the colaborador/apoyo (person or team);
  // `cadence` preserves the original Spanish cadence label when it was mapped
  // onto the engine's supported frequencies.
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
    support?: string,
    cadence?: string,
  ): RecurringTask => ({
    id,
    title,
    description: `Entregable: ${deliverable} · Categoría: ${categoria}${
      cadence ? ` · Cadencia: ${cadence}` : ""
    }`,
    frequency,
    assigneeId,
    support: support || undefined,
    estimatedHours: est,
    priority,
    department,
    anchorDate: D(anchorByFreq[frequency]),
    active: true,
  });

  const recurring: RecurringTask[] = [
    // Gobierno de Marca
    rc("r1", "Manual de marca corporativo (identidad visual, voz, tono, uniformes, señalización)", "Brand Book oficial", "Gobierno de Marca", "semiannual", "u2", "Brand", 16, "high", "Jerónimo"),
    rc("r2", "Auditoría visual de los 26 puntos de venta", "Scorecard nacional", "Gobierno de Marca", "monthly", "u1", "Brand", 8, "high", "Regionales"),
    rc("r3", "Estandarización de cotizaciones, PDFs, correos y WhatsApp comerciales", "Kit comercial oficial", "Gobierno de Marca", "monthly", "u1", "Brand", 5, "high", "Comercial"),
    // Customer Journey
    rc("r4", "Mapeo completo del viaje del cliente", "Customer Journey Map", "Customer Journey", "yearly", "u1", "CRM", 20, "high", "Todos los líderes"),
    rc("r5", "Definición de responsables por etapa", "Matriz RACI", "Customer Journey", "yearly", "u1", "CRM", 8, "high", "Gerencia Comercial"),
    // CRM y Datos
    rc("r6", "Integración Marketing–CRM", "Dashboard CRM operativo", "CRM y Datos", "monthly", "u1", "CRM", 6, "high", "Sistemas"),
    rc("r7", "Análisis de clientes (ticket, recompra, fuga, frecuencia)", "Reporte ejecutivo", "CRM y Datos", "monthly", "u1", "CRM", 5, "high"),
    rc("r8", "Segmentación de clientes por línea, ciudad y comportamiento", "Segmentos activos", "CRM y Datos", "quarterly", "u2", "CRM", 8, "medium", "Jerónimo"),
    // Experiencia Cliente
    rc("r9", "Sistema NPS postventa", "Reporte NPS", "Experiencia Cliente", "monthly", "u2", "Retail Marketing", 4, "high", "Sistemas"),
    rc("r10", "Encuestas de satisfacción por sucursal", "Ranking nacional", "Experiencia Cliente", "monthly", "u2", "Retail Marketing", 4, "high", "Regionales"),
    rc("r11", "Geolocalización Google y fotos", "Reporte de reseñas", "Experiencia Cliente", "monthly", "u3", "Retail Marketing", 3, "high", "Call Center"),
    rc("r12", "Flujo de malas reseñas", "Flujo documentado", "Experiencia Cliente", "monthly", "u1", "Retail Marketing", 4, "high", "Sistemas"),
    rc("r13", "Postventa: solicitar reseñas", "Campañas activas", "Experiencia Cliente", "monthly", "u3", "Retail Marketing", 5, "high", "Líder Regional"),
    // Contenido y Redes
    rc("r14", "Comité mensual de contenido con líderes de línea y regionales", "Acta y parrilla", "Contenido y Redes", "monthly", "u3", "Content", 3, "high", "Todos los líderes"),
    rc("r15", "Planeación de contenido mensual", "Parrilla aprobada", "Contenido y Redes", "monthly", "u3", "Content", 6, "high", "Alejandro"),
    rc("r16", "Producción audiovisual y diseño gráfico", "Piezas ejecutadas", "Contenido y Redes", "weekly", "u3", "Content", 8, "high"),
    rc("r17", "Gestión de LinkedIn corporativo", "Reporte mensual", "Contenido y Redes", "monthly", "u3", "Content", 3, "medium", "Jerónimo"),
    rc("r18", "Gestión de Meta (Facebook e Instagram)", "Reporte mensual", "Contenido y Redes", "monthly", "u3", "Content", 4, "high"),
    // Web y Canales Digitales
    rc("r19", "Rediseño estratégico del sitio web", "Nueva estructura web", "Web y Canales Digitales", "quarterly", "u1", "Performance", 24, "high", "Andrés", "Proyecto"),
    rc("r20", "Actualización continua del sitio web", "Sitio actualizado", "Web y Canales Digitales", "monthly", "u3", "Performance", 4, "medium", "Alejandro"),
    rc("r21", "MAP Google Business Profile para 26 tiendas", "Dashboard de reseñas y tráfico", "Web y Canales Digitales", "monthly", "u1", "Performance", 5, "high", "Regionales"),
    // Trade Marketing
    rc("r22", "Estandarización de material POP nacional (tarjetas, calendarios, cuadernos)", "Kit POP homologado", "Trade Marketing", "yearly", "u3", "Retail Marketing", 12, "medium", "Alejandro"),
    rc("r23", "Auditoría de ejecución visual en tiendas", "Reporte nacional", "Trade Marketing", "quarterly", "u3", "Retail Marketing", 10, "medium", "Regionales"),
    rc("r24", "Activaciones y campañas en punto de venta", "Reporte de resultados", "Trade Marketing", "monthly", "u2", "Retail Marketing", 6, "medium", "Andrés"),
    // Eventos y Relaciones
    rc("r25", "Evaluación ROI de eventos y ferias", "Reporte por evento", "Eventos y Relaciones", "quarterly", "u2", "Retail Marketing", 5, "medium", "Jerónimo · Finanzas", "Posterior al evento"),
    // Proveedores y Cooperación
    rc("r26", "Gestión de co-inversión con proveedores", "Reporte de inversiones", "Proveedores y Cooperación", "monthly", "u2", "Retail Marketing", 4, "medium", "Contabilidad"),
    rc("r27", "Control de inventario de material promocional (agregar al sistema)", "Inventario actualizado", "Proveedores y Cooperación", "monthly", "u2", "Retail Marketing", 3, "medium", "Jerónimo · Andrés"),
    // Operación del Área
    rc("r28", "Presupuesto y ejecución presupuestal", "Reporte financiero", "Operación del Área", "monthly", "u1", "Analytics", 5, "high", "Contabilidad"),
    rc("r29", "Gestión documental (OneDrive, plantillas, procesos)", "Repositorio actualizado", "Operación del Área", "monthly", "u2", "Analytics", 3, "high", "Andrés", "Continuo"),
    // Customer Experience
    rc("r30", "Estándares de atención para Call Center", "Manual de atención", "Customer Experience", "semiannual", "u2", "Retail Marketing", 10, "high", "Líder Call Center"),
    rc("r31", "Estándares de atención para vendedores", "Manual comercial", "Customer Experience", "semiannual", "u2", "Retail Marketing", 10, "high", "Marketing"),
  ];

  const financeCategories = [
    "Medios pagados",
    "Producción y diseño",
    "Eventos y ferias",
    "Trade y POP",
    "Agencias y proveedores",
    "Tecnología y software",
    "Investigación",
    "Otros",
  ];

  return {
    profiles,
    projects: [],
    tasks: [],
    comments: [],
    recurring,
    meetings: [],
    meetingActions: [],
    documents: [],
    kpis: [],
    kpiUpdates: [],
    announcements: [],
    activity: [],
    notifications: [],
    budgets: [],
    financeCategories,
  };
}
