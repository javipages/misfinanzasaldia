import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Mail,
  TrendingUp,
  Wallet,
  Target,
  PiggyBank,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { useUserStore } from "@/store/user";
interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const Onboarding = () => {
  const navigate = useNavigate();
  const { completeOnboarding, onboardingLoading } = useUserStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [userProfile, setUserProfile] = useState({
    emailNotifications: true,
    incomeCategories: [] as string[],
    expenseCategories: [] as string[],
    assetCategories: [] as string[],
  });
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await completeOnboarding(userProfile);
      navigate("/");
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const skipProfile = {
        emailNotifications: true,
        incomeCategories: defaultIncomeCategories,
        expenseCategories: defaultExpenseCategories,
        assetCategories: defaultAssetCategories,
      };
      console.log("Skipping onboarding with:", skipProfile);
      await completeOnboarding(skipProfile);
      console.log("Onboarding skipped successfully");
      navigate("/");
    } catch (error) {
      console.error("Error skipping onboarding:", error);
      // Even if there's an error, navigate to home
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const toggleIncomeCategory = (category: string) => {
    setUserProfile((prev) => ({
      ...prev,
      incomeCategories: prev.incomeCategories.includes(category)
        ? prev.incomeCategories.filter((c) => c !== category)
        : [...prev.incomeCategories, category],
    }));
  };

  const toggleExpenseCategory = (category: string) => {
    setUserProfile((prev) => ({
      ...prev,
      expenseCategories: prev.expenseCategories.includes(category)
        ? prev.expenseCategories.filter((c) => c !== category)
        : [...prev.expenseCategories, category],
    }));
  };

  const toggleAssetCategory = (category: string) => {
    setUserProfile((prev) => ({
      ...prev,
      assetCategories: prev.assetCategories.includes(category)
        ? prev.assetCategories.filter((c) => c !== category)
        : [...prev.assetCategories, category],
    }));
  };

  const addCustomIncomeCategory = (category: string) => {
    setUserProfile((prev) => ({
      ...prev,
      incomeCategories: [...prev.incomeCategories, category],
    }));
  };

  const addCustomExpenseCategory = (category: string) => {
    setUserProfile((prev) => ({
      ...prev,
      expenseCategories: [...prev.expenseCategories, category],
    }));
  };

  const addCustomAssetCategory = (category: string) => {
    setUserProfile((prev) => ({
      ...prev,
      assetCategories: [...prev.assetCategories, category],
    }));
  };

  const defaultIncomeCategories = [
    "Salario",
    "Freelance",
    "Inversiones",
    "Alquiler",
    "Otros ingresos",
  ];

  const defaultExpenseCategories = [
    "Alimentación",
    "Transporte",
    "Vivienda",
    "Entretenimiento",
    "Salud",
    "Educación",
    "Seguros",
    "Otros gastos",
  ];

  const defaultAssetCategories = [
    "Vivienda",
    "Vehículo",
    "Ahorros",
    "Inversiones",
    "Otros activos",
  ];

  const selectedCategories = {
    income: userProfile.incomeCategories,
    expense: userProfile.expenseCategories,
    asset: userProfile.assetCategories,
  };

  // Componente para categorías con input y layout mejorado
  const CategorySelector = ({
    availableCategories,
    selectedCategories,
    onToggle,
    onAddCustom,
  }: {
    availableCategories: string[];
    selectedCategories: string[];
    onToggle: (category: string) => void;
    onAddCustom: (category: string) => void;
  }) => {
    const [newCategory, setNewCategory] = useState("");

    const handleAddCategory = () => {
      if (
        newCategory.trim() &&
        !selectedCategories.includes(newCategory.trim())
      ) {
        onAddCustom(newCategory.trim());
        setNewCategory("");
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleAddCategory();
      }
    };

    const unselectedCategories = availableCategories.filter(
      (cat) => !selectedCategories.includes(cat)
    );

    return (
      <div className="space-y-6">
        {/* Categorías seleccionadas */}
        {selectedCategories.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Categorías seleccionadas:
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1 text-sm"
                >
                  {category}
                  <button
                    onClick={() => onToggle(category)}
                    className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Input para añadir categorías personalizadas */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Añadir categoría personalizada:
          </h4>
          <div className="flex gap-2">
            <Input
              placeholder="Escribe una categoría..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button
              onClick={handleAddCategory}
              disabled={!newCategory.trim()}
              size="sm"
            >
              Añadir
            </Button>
          </div>
        </div>

        {/* Categorías disponibles */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Categorías disponibles:
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {unselectedCategories.map((category) => (
              <button
                key={category}
                onClick={() => onToggle(category)}
                className="text-left p-3 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const steps: OnboardingStep[] = [
    {
      id: 0,
      title: "¡Bienvenido a tu gestor financiero!",
      description:
        "Vamos a configurar tu perfil para personalizar tu experiencia",
      icon: <Target className="w-8 h-8 text-blue-500" />,
      component: (
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Target className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">¡Comenzamos!</h3>
              <p className="text-muted-foreground">
                Esta aplicación te ayudará a controlar tus finanzas personales
                de manera fácil e intuitiva.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 1,
      title: "Categorías de Ingresos",
      description: "Selecciona las categorías de ingresos que más usas",
      icon: <TrendingUp className="w-8 h-8 text-green-500" />,
      component: (
        <CategorySelector
          availableCategories={defaultIncomeCategories}
          selectedCategories={userProfile.incomeCategories}
          onToggle={toggleIncomeCategory}
          onAddCustom={addCustomIncomeCategory}
        />
      ),
    },
    {
      id: 2,
      title: "Categorías de Gastos",
      description: "Selecciona las categorías de gastos que más usas",
      icon: <Wallet className="w-8 h-8 text-red-500" />,
      component: (
        <CategorySelector
          availableCategories={defaultExpenseCategories}
          selectedCategories={userProfile.expenseCategories}
          onToggle={toggleExpenseCategory}
          onAddCustom={addCustomExpenseCategory}
        />
      ),
    },
    {
      id: 3,
      title: "Activos Patrimoniales",
      description: "Selecciona los tipos de activos que posees",
      icon: <PiggyBank className="w-8 h-8 text-purple-500" />,
      component: (
        <CategorySelector
          availableCategories={defaultAssetCategories}
          selectedCategories={userProfile.assetCategories}
          onToggle={toggleAssetCategory}
          onAddCustom={addCustomAssetCategory}
        />
      ),
    },
    {
      id: 4,
      title: "¡Configuración completada!",
      description:
        "Tu perfil está listo. Revisa tu configuración y comienza a usar la aplicación.",
      icon: <Sparkles className="w-8 h-8 text-green-500" />,
      component: (
        <div className="space-y-6">
          {/* Resumen de configuración */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="font-semibold text-green-700">
                {selectedCategories.income.length}
              </div>
              <div className="text-sm text-green-600">
                Categorías de Ingresos
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <Wallet className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <div className="font-semibold text-red-700">
                {selectedCategories.expense.length}
              </div>
              <div className="text-sm text-red-600">Categorías de Gastos</div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center col-span-2 md:col-span-1">
              <PiggyBank className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="font-semibold text-purple-700">
                {selectedCategories.asset.length}
              </div>
              <div className="text-sm text-purple-600">Tipos de Activos</div>
            </div>
          </div>

          {/* Próximos pasos */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">
              🎯 Próximos pasos recomendados
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-l-4 border-l-blue-500 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h5 className="font-medium">Explora el Dashboard</h5>
                    <p className="text-sm text-muted-foreground">
                      Revisa tu resumen financiero y métricas principales
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-l-4 border-l-green-500 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <h5 className="font-medium">
                      Registra tus primeros movimientos
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      Agrega ingresos y gastos para empezar a construir tu
                      historial
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Configuración de notificaciones */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="email-notifications-final"
                checked={userProfile.emailNotifications}
                onCheckedChange={(checked) =>
                  setUserProfile((prev) => ({
                    ...prev,
                    emailNotifications: !!checked,
                  }))
                }
              />
              <Label
                htmlFor="email-notifications-final"
                className="flex items-center gap-2 flex-1"
              >
                <Mail className="w-4 h-4 text-blue-600" />
                Recibir notificaciones por correo sobre novedades y consejos
                financieros
              </Label>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {steps[currentStep].icon}
              <Badge variant="outline">
                Paso {currentStep + 1} de {steps.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={loading || onboardingLoading}
              className="text-muted-foreground hover:text-foreground"
            >
              {loading || onboardingLoading ? "Saltando..." : "Saltar"}
            </Button>
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl">
              {steps[currentStep].title}
            </CardTitle>
            <CardDescription className="text-base">
              {steps[currentStep].description}
            </CardDescription>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {steps[currentStep].component}

          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Anterior
            </Button>

            <Button
              onClick={handleNext}
              disabled={loading || onboardingLoading}
              className="flex items-center gap-2"
            >
              {loading || onboardingLoading ? (
                "Guardando..."
              ) : currentStep === steps.length - 1 ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Completar
                </>
              ) : (
                <>
                  Siguiente
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
