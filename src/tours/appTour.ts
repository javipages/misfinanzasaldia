import { DriveStep } from "driver.js";

export interface TourStep extends DriveStep {
  id: string;
  title: string;
  description: string;
  element?: string;
  popover?: {
    title?: string;
    description?: string;
    position?: string;
  };
}

export const appTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "¡Bienvenido a tu Gestor Financiero!",
    description:
      "Vamos a hacer un tour rápido para que conozcas las funcionalidades principales de la aplicación.",
    element: "body",
    popover: {
      title: "¡Bienvenido!",
      description:
        "Te mostraremos las funcionalidades principales de tu gestor financiero personal.",
      position: "center",
    },
  },
  {
    id: "sidebar",
    title: "Navegación Principal",
    description:
      "Desde el menú lateral puedes acceder a todas las secciones de la aplicación.",
    element: "[data-sidebar='content']",
    popover: {
      title: "Menú de Navegación",
      description:
        "Aquí encontrarás todas las secciones: Dashboard, Movimientos, Ingresos, Gastos, Activos, Inversiones, Ahorros, Objetivos y Configuración.",
      position: "right",
    },
  },

  {
    id: "dashboard-charts",
    title: "Gráficos Interactivos",
    description:
      "Los gráficos te ayudan a visualizar la evolución de tus ingresos, gastos y patrimonio.",
    element: ".grid.grid-cols-1.gap-4.md\\:grid-cols-2",
    popover: {
      title: "Visualización de Datos",
      description:
        "Revisa gráficos de resumen mensual, distribución de gastos y evolución del patrimonio para entender mejor tu situación financiera.",
      position: "top",
    },
  },
  {
    id: "movements-section",
    title: "Gestión de Movimientos",
    description:
      "Registra y administra todos tus ingresos y gastos de manera organizada.",
    element: "[href='/movements']",
    popover: {
      title: "Movimientos",
      description:
        "Aquí puedes ver, editar y eliminar todos tus movimientos financieros. Es el corazón de tu gestión financiera.",
      position: "right",
    },
  },
  {
    id: "income-section",
    title: "Ingresos",
    description:
      "Gestiona todas tus fuentes de ingresos y mantenlas organizadas por categorías.",
    element: "[href='/income']",
    popover: {
      title: "Ingresos",
      description:
        "Registra y categoriza todos tus ingresos para tener un control preciso de tus entradas de dinero.",
      position: "right",
    },
  },
  {
    id: "expenses-section",
    title: "Gastos",
    description:
      "Controla tus gastos, organízalos por categorías y analiza patrones de consumo.",
    element: "[href='/expenses']",
    popover: {
      title: "Gastos",
      description:
        "Lleva un registro detallado de todos tus gastos y analiza en qué categorías gastas más dinero.",
      position: "right",
    },
  },
  {
    id: "assets-section",
    title: "Activos",
    description:
      "Gestiona tu patrimonio: propiedades, vehículos, inversiones y otros activos valuables.",
    element: "[href='/assets']",
    popover: {
      title: "Activos",
      description:
        "Registra y valora todos tus activos para tener una visión completa de tu patrimonio neto.",
      position: "right",
    },
  },
  {
    id: "investments-section",
    title: "Inversiones",
    description:
      "Gestiona tu portafolio de inversiones y realiza un seguimiento de su rendimiento.",
    element: "[href='/investments']",
    popover: {
      title: "Inversiones",
      description:
        "Registra tus inversiones, acciones, fondos y criptomonedas para hacer un seguimiento completo de tu portafolio.",
      position: "right",
    },
  },
  {
    id: "savings-section",
    title: "Ahorro",
    description:
      "Gestiona tus cuentas de ahorro y metas de ahorro a corto y largo plazo.",
    element: "[href='/savings']",
    popover: {
      title: "Ahorro",
      description:
        "Crea cuentas de ahorro específicas, establece metas y realiza un seguimiento de tu progreso hacia la libertad financiera.",
      position: "right",
    },
  },
  {
    id: "goals-section",
    title: "Objetivos",
    description:
      "Define y gestiona tus objetivos financieros para mantenerte motivado y enfocado.",
    element: "[href='/goals']",
    popover: {
      title: "Objetivos",
      description:
        "Establece objetivos claros como comprar una casa, un viaje o la jubilación, y haz un seguimiento de tu progreso.",
      position: "right",
    },
  },
  {
    id: "settings-section",
    title: "Configuración",
    description:
      "Personaliza la aplicación según tus preferencias y gestiona tu perfil.",
    element: "[href='/settings']",
    popover: {
      title: "Configuración",
      description:
        "Aquí puedes cambiar configuraciones, gestionar tu perfil y acceder a opciones avanzadas.",
      position: "right",
    },
  },
  {
    id: "tour-complete",
    title: "¡Tour Completado!",
    description:
      "Ahora conoces las funcionalidades principales. Puedes repetir este tour desde la configuración cuando quieras.",
    element: "body",
    popover: {
      title: "¡Perfecto!",
      description:
        "Ya conoces las funcionalidades principales de tu gestor financiero. ¡Empieza a explorar y tomar el control de tus finanzas!",
      position: "center",
    },
  },
];

export const getTourSteps = (isMobile: boolean = false): TourStep[] => {
  // Personalizamos los pasos según la página actual y el dispositivo
  let baseSteps = [...appTourSteps];

  // En móvil, excluimos el paso de dashboard-charts para una mejor experiencia
  if (isMobile) {
    baseSteps = baseSteps.filter((step) => step.id !== "dashboard-charts");
  }

  return baseSteps;
};
