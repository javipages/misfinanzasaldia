import { Outlet } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Tags, Wallet, LineChart } from "lucide-react";
import { NavigationCard } from "@/components/NavigationCard";

function SettingsHome() {
  const navigationCards = [
    {
      title: "Categorías",
      description:
        "Gestiona las categorías de ingresos y gastos con sus subcategorías",
      icon: Tags,
      href: "/settings/categories",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Activos",
      description:
        "Configura tus activos patrimoniales como cuentas bancarias, inversiones y otros",
      icon: Wallet,
      href: "/settings/assets",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Interactive Brokers (IBKR)",
      description:
        "Conecta tu cuenta de IBKR para sincronizar automáticamente tus posiciones",
      icon: LineChart,
      href: "/settings/ibkr",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona las diferentes áreas de tu aplicación financiera
          </p>
        </div>
      </div>
      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {navigationCards.map((card) => (
          <NavigationCard
            key={card.href}
            title={card.title}
            description={card.description}
            icon={card.icon}
            href={card.href}
            color={card.color}
            bgColor={card.bgColor}
          />
        ))}
      </div>

      <div className="mt-8 p-6 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Consejos para la configuración</h3>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>
            • Organiza tus categorías de forma lógica para facilitar el
            seguimiento
          </li>
          <li>
            • Los activos patrimoniales te ayudan a hacer seguimiento de tu
            patrimonio neto
          </li>
          <li>
            • Conecta IBKR para ver tus posiciones actualizadas automáticamente con tipo de cambio en tiempo real
          </li>
          <li>
            • Puedes personalizar las categorías según tus necesidades
            específicas
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function Settings() {
  return <Outlet />;
}

export { SettingsHome };
