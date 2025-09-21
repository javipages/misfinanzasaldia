import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  CategoryMatrix,
  type CategoryMatrixRef,
} from "@/components/CategoryMatrix";
import { StatsSummary } from "@/components/StatsSummary";

const Expenses = () => {
  const [stats, setStats] = useState({
    yearTotal: 0,
    monthlyAverage: 0,
    bestMonth: { index: 0, amount: 0 },
  });
  const matrixRef = useRef<CategoryMatrixRef>(null);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gestión de Gastos
          </h1>
          <p className="text-muted-foreground">
            Administra tus gastos por categoría y mes
          </p>
        </div>
        <Button onClick={() => matrixRef.current?.openAddDialog(null, null)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo gasto
        </Button>
      </div>

      <StatsSummary stats={stats} variant="expense" />

      <CategoryMatrix
        ref={matrixRef}
        kind="expense"
        onStatsChange={(s) =>
          setStats({
            yearTotal: s.yearTotal,
            monthlyAverage: s.monthlyAverage,
            bestMonth: s.bestMonth,
          })
        }
      />
    </div>
  );
};

export default Expenses;
