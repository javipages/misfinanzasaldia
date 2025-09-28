import { useEffect, useRef } from "react";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { getTourSteps } from "@/tours/appTour";
interface TourProps {
  isVisible: boolean;
  onClose: () => void;
  autoStart?: boolean;
}

export const Tour = ({ isVisible, onClose, autoStart = false }: TourProps) => {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const steps = getTourSteps();

  useEffect(() => {
    if (isVisible && steps.length > 0) {
      // Crear instancia del driver
      driverRef.current = driver({
        steps: steps as DriveStep[],
        onDestroyStarted: () => {
          onClose();
        },
        // Personalizar textos en español
        nextBtnText: "Siguiente",
        prevBtnText: "Anterior",
        doneBtnText: "Finalizar",
        // Aplicar clase CSS personalizada
        popoverClass: "custom-driver-popover",
        // Opciones adicionales para mejor experiencia
        animate: true,
        allowClose: true,
      });

      if (autoStart) {
        // Pequeño delay para asegurar que el DOM esté listo
        setTimeout(() => {
          if (driverRef.current) {
            driverRef.current.drive();
          }
        }, 200);
      }
    }

    return () => {
      if (driverRef.current) {
        try {
          driverRef.current.destroy();
          driverRef.current = null;
        } catch (error) {
          console.warn("Error destroying driver:", error);
        }
      }
    };
  }, [isVisible, autoStart, steps, onClose]);

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay sutil para el tour */}
      <div className="fixed inset-0 bg-black/10 z-30 pointer-events-none" />
    </>
  );
};
