import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSettings } from "@/hooks/use-settings";
import { HelpCircle, RotateCcw } from "lucide-react";
import {
  getUserData,
  updateUserTourCompleted,
} from "@/integrations/supabase/preferences";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EditableCategory = { id: string; name: string; display_order: number };

function CategoryList({
  title,
  items,
  onAdd,
  onRename,
  onDelete,
  onMove,
}: {
  title: string;
  items: EditableCategory[];
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const [newName, setNewName] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Nueva categoría"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button
            onClick={() => {
              const trimmed = newName.trim();
              if (!trimmed) return;
              onAdd(trimmed);
              setNewName("");
            }}
            className="w-full sm:w-auto"
          >
            Añadir
          </Button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-2">Nombre</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((cat, idx) => (
                <tr key={cat.id}>
                  <td className="py-2 pr-2">
                    <Input
                      value={cat.name}
                      onChange={(e) => onRename(cat.id, e.target.value)}
                    />
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => onMove(cat.id, "up")}
                        disabled={idx === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => onMove(cat.id, "down")}
                        disabled={idx === items.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => onDelete(cat.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  type AssetType =
    | "cuenta_bancaria"
    | "inversion"
    | "efectivo"
    | "cripto"
    | "otro";
  const {
    income,
    expense,
    assets,
    isLoading,
    isFetching,
    addIncome,
    addExpense,
    addAsset,
    renameIncome,
    renameExpense,
    renameAsset,
    changeAssetType,
    moveIncome,
    moveExpense,
    deleteIncome,
    deleteExpense,
    deleteAsset,
  } = useSettings();
  const loading = isLoading;
  const saving = isFetching;
  const [confirm, setConfirm] = useState<{
    open: boolean;
    id: string | null;
    scope: "income" | "expense" | null;
  }>({
    open: false,
    id: null,
    scope: null,
  });
  const [tourCompleted, setTourCompleted] = useState<boolean | null>(null);
  const [isResettingTour, setIsResettingTour] = useState(false);

  const sortedIncome = income;
  const sortedExpense = expense;
  const sortedAssets = assets as (EditableCategory & { type: AssetType })[];

  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetType, setNewAssetType] =
    useState<AssetType>("cuenta_bancaria");

  // Load tour status on component mount
  useEffect(() => {
    const loadTourStatus = async () => {
      try {
        const userData = await getUserData();
        setTourCompleted(userData?.tour_completed || false);
      } catch (error) {
        console.error("Error loading tour status:", error);
      }
    };
    loadTourStatus();
  }, []);

  const handleResetTour = async () => {
    setIsResettingTour(true);
    try {
      await updateUserTourCompleted(false);
      setTourCompleted(false);
      // Trigger tour restart by dispatching a custom event
      window.dispatchEvent(new CustomEvent("restart-tour"));
    } catch (error) {
      console.error("Error resetting tour:", error);
    } finally {
      setIsResettingTour(false);
    }
  };

  if (loading) {
    return <div className="p-4">Cargando...</div>;
  }

  async function handleAddIncome(name: string) {
    await addIncome.mutateAsync(name);
  }

  async function handleAddExpense(name: string) {
    await addExpense.mutateAsync(name);
  }

  async function handleRenameIncome(id: string, name: string) {
    await renameIncome.mutateAsync({ id, name });
  }

  async function handleRenameExpense(id: string, name: string) {
    await renameExpense.mutateAsync({ id, name });
  }

  // local reorder helper removed; optimismo se maneja en el hook

  async function handleMoveIncome(id: string, direction: "up" | "down") {
    // optimistic handled by hook
    await moveIncome.mutateAsync({ id, direction });
  }

  async function handleMoveExpense(id: string, direction: "up" | "down") {
    await moveExpense.mutateAsync({ id, direction });
  }

  async function handleDeleteIncome(id: string) {
    await deleteIncome.mutateAsync(id);
  }

  async function handleDeleteExpense(id: string) {
    await deleteExpense.mutateAsync(id);
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <div className="text-sm text-muted-foreground">
          {saving ? "Guardando..." : ""}
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CategoryList
          title="Categorías de ingresos"
          items={sortedIncome}
          onAdd={handleAddIncome}
          onRename={handleRenameIncome}
          onDelete={(id) => setConfirm({ open: true, id, scope: "income" })}
          onMove={handleMoveIncome}
        />
        <CategoryList
          title="Categorías de gastos"
          items={sortedExpense}
          onAdd={handleAddExpense}
          onRename={handleRenameExpense}
          onDelete={(id) => setConfirm({ open: true, id, scope: "expense" })}
          onMove={handleMoveExpense}
        />
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Activos patrimoniales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Nuevo activo"
              value={newAssetName}
              onChange={(e) => setNewAssetName(e.target.value)}
            />
            <Select
              value={newAssetType}
              onValueChange={(v) => setNewAssetType(v as AssetType)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cuenta_bancaria">Cuenta</SelectItem>
                <SelectItem value="inversion">Inversión</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="cripto">Crypto</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                const trimmed = newAssetName.trim();
                if (!trimmed) return;
                void addAsset.mutateAsync({
                  name: trimmed,
                  type: newAssetType,
                });
                setNewAssetName("");
                setNewAssetType("cuenta_bancaria");
              }}
              className="w-full sm:w-auto"
            >
              Añadir
            </Button>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-2">Nombre</th>
                  <th className="py-2 pr-2">Tipo</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedAssets.map((cat) => (
                  <tr key={cat.id}>
                    <td className="py-2 pr-2">
                      <Input
                        value={cat.name}
                        onChange={(e) =>
                          void renameAsset.mutateAsync({
                            id: cat.id,
                            name: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Select
                        value={cat.type}
                        onValueChange={(v) =>
                          void changeAssetType.mutateAsync({
                            id: cat.id,
                            type: v as AssetType,
                          })
                        }
                      >
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cuenta_bancaria">
                            Cuenta
                          </SelectItem>
                          <SelectItem value="inversion">Inversión</SelectItem>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="cripto">Crypto</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="destructive"
                          onClick={() => void deleteAsset.mutateAsync(cat.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Tour Guiado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Estado del tour</p>
                <p className="text-xs text-muted-foreground">
                  {tourCompleted
                    ? "El tour guiado ya ha sido completado"
                    : "El tour guiado está disponible"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {tourCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetTour}
                    disabled={isResettingTour}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {isResettingTour ? "Reiniciando..." : "Reiniciar Tour"}
                  </Button>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p>
                El tour guiado te ayudará a conocer las funcionalidades
                principales de la aplicación. Se mostrará automáticamente
                después de completar el onboarding inicial.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm.open}
        title="Eliminar categoría"
        description="Esta acción no se puede deshacer. ¿Seguro que quieres eliminar la categoría?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (!confirm.id || !confirm.scope) return;
          if (confirm.scope === "income") {
            void handleDeleteIncome(confirm.id);
          } else {
            void handleDeleteExpense(confirm.id);
          }
        }}
        onClose={() => setConfirm({ open: false, id: null, scope: null })}
      />
    </div>
  );
}
