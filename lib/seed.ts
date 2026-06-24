import { addDays, formatISO, startOfDay } from "date-fns";
import type { MosData, Profile, RecurringTask } from "./types";

const dayIso = (d: Date) => formatISO(startOfDay(d), { representation: "date" });

/**
 * Real workspace seed for Tirepro Marketing. Contains ONLY the data provided by
 * the team: the three users and the recurring activity catalog. Tasks are
 * materialized from the recurring definitions by the occurrence engine — there
 * is intentionally no fabricated project/task/KPI/meeting demo data.
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
  };
}
