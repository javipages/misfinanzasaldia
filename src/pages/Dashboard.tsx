import { useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target,
  Plus,
  Calendar
} from "lucide-react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  LineChart, 
  Line 
} from "recharts";

const Dashboard = () => {
  const [selectedYear, setSelectedYear] = useState("2024");

  // Mock data
  const years = ["2024", "2023", "2022"];
  
  const monthlyData = [
    { month: "Ene", ingresos: 3500, gastos: 2800, ahorro: 700 },
    { month: "Feb", ingresos: 3500, gastos: 2900, ahorro: 600 },
    { month: "Mar", ingresos: 3700, gastos: 3100, ahorro: 600 },
    { month: "Abr", ingresos: 3500, gastos: 2750, ahorro: 750 },
    { month: "May", ingresos: 3500, gastos: 2850, ahorro: 650 },
    { month: "Jun", ingresos: 3800, gastos: 3000, ahorro: 800 },
  ];

  const expenseCategories = [
    { name: "Vivienda", value: 1200, color: "hsl(var(--chart-1))" },
    { name: "Comida", value: 600, color: "hsl(var(--chart-2))" },
    { name: "Transporte", value: 400, color: "hsl(var(--chart-3))" },
    { name: "Ocio", value: 300, color: "hsl(var(--chart-4))" },
    { name: "Otros", value: 350, color: "hsl(var(--chart-5))" },
  ];

  const patrimonyData = [
    { month: "Ene", patrimonio: 15000 },
    { month: "Feb", patrimonio: 15600 },
    { month: "Mar", patrimonio: 16200 },
    { month: "Abr", patrimonio: 16950 },
    { month: "May", patrimonio: 17600 },
    { month: "Jun", patrimonio: 18400 },
  ];

  const totalIngresos = monthlyData.reduce((sum, item) => sum + item.ingresos, 0);
  const totalGastos = monthlyData.reduce((sum, item) => sum + item.gastos, 0);
  const totalAhorro = totalIngresos - totalGastos;
  const currentPatrimony = patrimonyData[patrimonyData.length - 1]?.patrimonio || 0;

  return (
    <div className="space-y-6">
      {/* Header with year selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Financiero</h1>
          <p className="text-muted-foreground">Resumen de tu situación financiera</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Año
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Ingresos"
          value={`€${totalIngresos.toLocaleString()}`}
          change="+5.2% vs mes anterior"
          icon={TrendingUp}
          variant="success"
        />
        <MetricCard
          title="Total Gastos"
          value={`€${totalGastos.toLocaleString()}`}
          change="-2.1% vs mes anterior"
          icon={TrendingDown}
          variant="warning"
        />
        <MetricCard
          title="Ahorro Neto"
          value={`€${totalAhorro.toLocaleString()}`}
          change="+€150 vs mes anterior"
          icon={Target}
          variant="success"
        />
        <MetricCard
          title="Patrimonio Total"
          value={`€${currentPatrimony.toLocaleString()}`}
          change="+4.6% vs mes anterior"
          icon={Wallet}
          variant="default"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Overview */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Resumen Mensual {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`€${value}`, '']}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="ingresos" fill="hsl(var(--chart-2))" name="Ingresos" />
                <Bar dataKey="gastos" fill="hsl(var(--chart-6))" name="Gastos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Distribution */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Distribución de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expenseCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`€${value}`, 'Gasto']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {expenseCategories.map((category, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm text-muted-foreground">{category.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Patrimony Evolution */}
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolución del Patrimonio</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={patrimonyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`€${value}`, 'Patrimonio']}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="patrimonio" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;