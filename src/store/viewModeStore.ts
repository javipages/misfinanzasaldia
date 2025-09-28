import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect } from "react";

interface ViewModeState {
  viewMode: "table" | "cards";
  setViewMode: (mode: "table" | "cards") => void;
}

export const useViewMode = create<ViewModeState>()(
  persist(
    (set) => ({
      viewMode: "table",
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: "view-mode-storage",
    }
  )
);

// Effect para resetear automáticamente a modo tabla en desktop
export const useViewModeEffect = () => {
  const { viewMode, setViewMode } = useViewMode();

  useEffect(() => {
    // Detectar si estamos en desktop (pantalla >= 640px)
    const checkIsDesktop = () => window.innerWidth >= 640;

    // Si estamos en desktop y el modo no es tabla, resetear
    if (checkIsDesktop() && viewMode !== "table") {
      setViewMode("table");
    }

    // Listener para cambios de tamaño de ventana
    const handleResize = () => {
      if (checkIsDesktop() && viewMode !== "table") {
        setViewMode("table");
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, [viewMode, setViewMode]);
};
