import { PanelLeftIcon, Grid3X3, Table, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserStore } from "@/store/user";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useViewMode } from "@/store/viewModeStore";
import { useLocation } from "react-router-dom";

interface TopbarProps {
  onStartTour?: () => void;
}

export function Topbar({ onStartTour }: TopbarProps = {}) {
  const isMobile = useIsMobile();
  const year = useUserStore((s) => s.year);
  const setYear = useUserStore((s) => s.setYear);
  const { toggleSidebar } = useSidebar();
  const { viewMode, setViewMode } = useViewMode();
  const location = useLocation();

  // No mostrar en desktop
  if (!isMobile) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="md:hidden"
      >
        <PanelLeftIcon className="h-5 w-5" />
        <span className="sr-only">Abrir sidebar</span>
      </Button>

      <div className="flex items-center gap-2 flex-1">
        <Input
          type="number"
          min={2000}
          max={3000}
          value={year}
          onChange={(e) => {
            const v = Number(e.target.value || new Date().getFullYear());
            void setYear(v);
          }}
          className="w-24"
        />
        <span className="text-sm text-muted-foreground">Año</span>
        {onStartTour && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartTour}
            className="ml-2"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="sr-only">Tour guiado</span>
          </Button>
        )}
      </div>

      {(location.pathname === "/movements" ||
        location.pathname === "/assets") && (
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="h-8 px-2"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-8 px-2"
          >
            <Table className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
