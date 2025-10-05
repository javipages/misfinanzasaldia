import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LucideIcon, ArrowRight } from "lucide-react";

interface NavigationCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color?: string;
  bgColor?: string;
}

export function NavigationCard({
  title,
  description,
  icon: IconComponent,
  href,
  color = "text-blue-600",
  bgColor = "bg-blue-50 dark:bg-blue-950",
}: NavigationCardProps) {
  return (
    <Link to={href}>
      <Card className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${bgColor}`}>
              <IconComponent className={`h-6 w-6 ${color}`} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}
