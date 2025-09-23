import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import {
  CategoryMatrix,
  type CategoryMatrixRef,
} from "@/components/CategoryMatrix";
import { StatsSummary } from "@/components/StatsSummary";
import { ImportBudgetDialog } from "@/components/ui/import-budget-dialog";

const Income = () => {
  const matrixRef = useRef<CategoryMatrixRef>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({
    yearTotal: 0,
    monthlyAverage: 0,
    bestMonth: { index: 0, amount: 0 },
  });

  const handleImportSuccess = () => {
    // Force refresh of the data
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gestión de Ingresos
          </h1>
          <p className="text-muted-foreground">
            Administra tus ingresos por categoría y mes
          </p>
        </div>
        <div className="flex gap-2">
          <ImportBudgetDialog onSuccess={handleImportSuccess}>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Importar JSON
            </Button>
          </ImportBudgetDialog>
          <Button onClick={() => matrixRef.current?.openAddDialog(null, null)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo ingreso
          </Button>
        </div>
      </div>

      <StatsSummary stats={stats} variant="income" />
      <CategoryMatrix
        key={refreshKey}
        ref={matrixRef}
        kind="income"
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

export default Income;
