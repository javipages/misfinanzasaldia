import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Euro,
  Calendar,
  TrendingUp,
  TrendingDown,
  Percent,
  Search,
  Edit,
} from "lucide-react";
import { type InvestmentItem } from "@/hooks/use-investments";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectInvestment: (investment: InvestmentItem) => void;
  investments: InvestmentItem[];
};

export function InvestmentSelectionDialog({
  open,
  onClose,
  onSelectInvestment,
  investments,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInvestments = investments.filter((investment) =>
    investment.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}%`;
  };

  const getTypeConfig = (type: string) => {
    const configs = {
      etf: { label: "ETF", color: "bg-blue-100 text-blue-800" },
      acciones: { label: "Acciones", color: "bg-green-100 text-green-800" },
      crypto: { label: "Crypto", color: "bg-orange-100 text-orange-800" },
      fondos: { label: "Fondos", color: "bg-purple-100 text-purple-800" },
      bonos: { label: "Bonos", color: "bg-indigo-100 text-indigo-800" },
      otros: { label: "Otros", color: "bg-gray-100 text-gray-800" },
    };
    return configs[type as keyof typeof configs] || configs.otros;
  };

  const handleClose = () => {
    setSearchTerm("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Seleccionar Inversión para Editar</DialogTitle>
          <DialogDescription>
            Elige la inversión que deseas modificar de tu portafolio
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Buscar inversión</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="search"
              placeholder="Buscar por nombre de inversión..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Investments List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {filteredInvestments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "No se encontraron inversiones"
                : "No hay inversiones disponibles"}
            </div>
          ) : (
            filteredInvestments.map((investment) => {
              const typeConfig = getTypeConfig(investment.type);
              const isProfit = investment.profit_loss >= 0;

              return (
                <Card
                  key={investment.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    onSelectInvestment(investment);
                    setSearchTerm("");
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-foreground">
                            {investment.name}
                          </h3>
                          <Badge className={typeConfig.color}>
                            {typeConfig.label}
                          </Badge>
                        </div>

                        {investment.description && (
                          <p className="text-sm text-muted-foreground">
                            {investment.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            {investment.account_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(investment.purchase_date)}
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Invertido Actual
                            </div>
                            <div className="font-medium">
                              {formatCurrency(investment.total_invested_amount)}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-muted-foreground">
                              Valor Actual
                            </div>
                            <div className="font-medium">
                              {formatCurrency(investment.current_account_value)}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-muted-foreground">
                              Ganancia/Pérdida
                            </div>
                            <div
                              className={`font-bold ${
                                isProfit ? "text-success" : "text-destructive"
                              }`}
                            >
                              {isProfit ? "+" : ""}
                              {formatCurrency(investment.profit_loss)}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-muted-foreground">
                              Rentabilidad
                            </div>
                            <div
                              className={`font-bold ${
                                isProfit ? "text-success" : "text-destructive"
                              }`}
                            >
                              {formatPercentage(
                                investment.profit_loss_percentage
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex items-center justify-center">
                        <Edit className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
