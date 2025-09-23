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
import { Input } from "@/components/ui/input";
import { useEffect } from "react";
import { useYearStore } from "@/store/year";
import { useIsMobile } from "@/hooks/use-mobile";

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

export function AppSidebar() {
  const { signOut } = useAuth();
  const location = useLocation();
  const year = useYearStore((s) => s.year);
  const hydrate = useYearStore((s) => s.hydrate);
  const setYear = useYearStore((s) => s.setYear);
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await signOut();
  };

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="p-4">
        {!isMobile && (
          <div className="flex items-center gap-2 w-full">
            <Input
              type="number"
              min={2000}
              max={3000}
              value={year}
              onChange={(e) => {
                const v = Number(e.target.value || new Date().getFullYear());
                void setYear(v);
              }}
            />
          </div>
        )}
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
                    <Link to={item.url} className="flex items-center gap-2">
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
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
