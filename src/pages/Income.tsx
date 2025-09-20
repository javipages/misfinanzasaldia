import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CategoryMatrix } from "@/components/CategoryMatrix";
import { StatsSummary } from "@/components/StatsSummary";

const Income = () => {
  const [stats, setStats] = useState({
    yearTotal: 0,
    monthlyAverage: 0,
    bestMonth: { index: 0, amount: 0 },
  });
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
        <Button className="bg-success hover:bg-success/90">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      <StatsSummary stats={stats} variant="income" />
      <CategoryMatrix
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
