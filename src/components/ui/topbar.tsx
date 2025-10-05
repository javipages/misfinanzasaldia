import {
  PanelLeftIcon,
  Grid3X3,
  Table,
  HelpCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserStore } from "@/store/user";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useViewMode } from "@/store/viewModeStore";
import { useLocation } from "react-router-dom";
import { usePrivacyStore } from "@/store/privacyStore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddYearDialog } from "@/components/ui/add-year-dialog";

interface TopbarProps {
  onStartTour?: () => void;
}

export function Topbar({ onStartTour }: TopbarProps = {}) {
  const isMobile = useIsMobile();
  const year = useUserStore((s) => s.year);
  const availableYears = useUserStore((s) => s.availableYears);
  const setYear = useUserStore((s) => s.setYear);
  const refreshAvailableYears = useUserStore((s) => s.refreshAvailableYears);
  const activateYear = useUserStore((s) => s.activateYear);
  const { toggleSidebar } = useSidebar();
  const { viewMode, setViewMode } = useViewMode();
  const location = useLocation();
  const maskNumbers = usePrivacyStore((s) => s.maskNumbers);
  const toggleMaskNumbers = usePrivacyStore((s) => s.toggleMaskNumbers);
  const [addYearDialogOpen, setAddYearDialogOpen] = useState(false);

  useEffect(() => {
    if (isMobile) {
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
        <Select
          value={String(year)}
          onValueChange={(value) => {
            void handleYearChange(value);
          }}
        >
          <SelectTrigger className="w-24" data-sensitive-skip="true">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((availableYear) => (
              <SelectItem key={availableYear} value={String(availableYear)}>
                {availableYear}
              </SelectItem>
            ))}
            <SelectItem value="__new">Añadir año…</SelectItem>
          </SelectContent>
        </Select>
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

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMaskNumbers}
          aria-pressed={maskNumbers}
          aria-label={maskNumbers ? "Mostrar cantidades" : "Ocultar cantidades"}
          title={maskNumbers ? "Mostrar cantidades" : "Ocultar cantidades"}
          className="h-8 w-8"
        >
          {maskNumbers ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
        {(location.pathname === "/movements" ||
          location.pathname === "/assets") && (
          <>
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
          </>
        )}
      </div>
      <AddYearDialog
        open={addYearDialogOpen}
        onClose={() => setAddYearDialogOpen(false)}
        onConfirm={handleAddYearConfirm}
        availableYears={availableYears}
        suggestedYear={Math.max(...yearOptions, new Date().getFullYear()) + 1}
      />
    </div>
  );
}
