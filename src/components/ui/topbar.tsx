import { PanelLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useYearStore } from "@/store/year";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export function Topbar() {
  const isMobile = useIsMobile();
  const year = useYearStore((s) => s.year);
  const setYear = useYearStore((s) => s.setYear);
  const { toggleSidebar } = useSidebar();

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
      </div>
    </div>
  );
}
