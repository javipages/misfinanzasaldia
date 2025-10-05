import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  PiggyBank,
  BarChart3,
  LogOut,
  Settings,
  ArrowUpDown,
  HelpCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/contexts/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserStore } from "@/store/user";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";
import { usePrivacyStore } from "@/store/privacyStore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddYearDialog } from "@/components/ui/add-year-dialog";

// Elementos del menú

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Movimientos", url: "/movements", icon: ArrowUpDown },
  { title: "Ingresos", url: "/income", icon: TrendingUp },
  { title: "Gastos", url: "/expenses", icon: TrendingDown },
  { title: "Patrimonio", url: "/assets", icon: Wallet },
  { title: "Inversiones", url: "/investments", icon: BarChart3 },
  { title: "Ahorro", url: "/savings", icon: PiggyBank },
  { title: "Objetivos", url: "/goals", icon: Target },
  { title: "Configuración", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  onStartTour?: () => void;
}

export function AppSidebar({ onStartTour }: AppSidebarProps = {}) {
  const { signOut } = useAuth();
  const location = useLocation();
  const year = useUserStore((s) => s.year);
  const availableYears = useUserStore((s) => s.availableYears);
  const setYear = useUserStore((s) => s.setYear);
  const refreshAvailableYears = useUserStore((s) => s.refreshAvailableYears);
  const activateYear = useUserStore((s) => s.activateYear);
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const maskNumbers = usePrivacyStore((s) => s.maskNumbers);
  const toggleMaskNumbers = usePrivacyStore((s) => s.toggleMaskNumbers);
  const [addYearDialogOpen, setAddYearDialogOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  const handleCloseSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  useEffect(() => {
    if (!isMobile) {
      void refreshAvailableYears();
    }
  }, [isMobile, refreshAvailableYears]);

  const yearOptions = useMemo(() => {
    return availableYears.length > 0 ? availableYears : [year];
  }, [availableYears, year]);

  const handleYearChange = useCallback(
    async (value: string) => {
      if (value === "__new") {
        setAddYearDialogOpen(true);
        return;
      }

      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        void setYear(parsed);
      }
    },
    [setYear]
  );

  const handleAddYearConfirm = useCallback(
    async (
      newYear: number,
      sourceYear: number | null,
      initialCategory?: { name: string; type: "income" | "expense" | "asset" }
    ) => {
      await activateYear(newYear, sourceYear ?? undefined, initialCategory);
    },
    [activateYear]
  );

  return (
    <Sidebar variant="inset" data-sensitive-skip="true">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 w-full">
          {!isMobile && (
            <Select
              value={String(year)}
              onValueChange={(value) => {
                void handleYearChange(value);
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecciona un año" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((availableYear) => (
                  <SelectItem key={availableYear} value={String(availableYear)}>
                    {availableYear}
                  </SelectItem>
                ))}
                <SelectItem value="__new">Añadir nuevo año…</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMaskNumbers}
            aria-pressed={maskNumbers}
            aria-label={
              maskNumbers ? "Mostrar cantidades" : "Ocultar cantidades"
            }
            title={maskNumbers ? "Mostrar cantidades" : "Ocultar cantidades"}
            className="shrink-0"
          >
            {maskNumbers ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <Link
                      to={item.url}
                      className="flex items-center gap-2"
                      onClick={handleCloseSidebar}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {onStartTour && (
          <Button
            onClick={() => {
              onStartTour();
              handleCloseSidebar();
            }}
            variant="ghost"
            className="w-full flex items-center gap-2 mb-2"
          >
            <HelpCircle className="w-4 h-4" />
            Tour Guiado
          </Button>
        )}
        <Button
          onClick={() => {
            handleLogout();
            handleCloseSidebar();
          }}
          variant="outline"
          className="w-full flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </Button>
      </SidebarFooter>
      <AddYearDialog
        open={addYearDialogOpen}
        onClose={() => setAddYearDialogOpen(false)}
        onConfirm={handleAddYearConfirm}
        availableYears={availableYears}
        suggestedYear={Math.max(...yearOptions, new Date().getFullYear()) + 1}
      />
    </Sidebar>
  );
}
