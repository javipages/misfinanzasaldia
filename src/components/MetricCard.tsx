import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  variant?:
    | "default"
    | "success"
    | "warning"
    | "destructive"
    | "info"
    | "primary";
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  variant = "default",
  className = "",
}: MetricCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-success/20 bg-gradient-to-br from-success/5 to-success/10";
      case "warning":
        return "border-warning/20 bg-gradient-to-br from-warning/5 to-warning/10";
      case "destructive":
        return "border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10";
      case "info":
        return "border-info/20 bg-gradient-to-br from-info/5 to-info/10";
      case "primary":
        return "border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10";
      default:
        return "border-border bg-gradient-to-br from-card to-card/50";
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case "success":
        return "text-success";
      case "warning":
        return "text-warning";
      case "destructive":
        return "text-destructive";
      case "info":
        return "text-info";
      case "primary":
        return "text-primary";
      default:
        return "text-primary";
    }
  };

  return (
    <Card
      className={`${getVariantStyles()} shadow-card hover:shadow-elevated transition-all duration-200 ${className}`}
    >
      <CardContent className="px-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {change && (
              <p
                className={`text-xs ${
                  change.startsWith("+")
                    ? "text-success"
                    : change.startsWith("-")
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {change}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-background/50 ${getIconColor()}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
