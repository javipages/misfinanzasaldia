import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSettings } from "@/hooks/use-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentCardSkeleton } from "@/components/PageSkeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AssetType =
  | "cuenta_bancaria"
  | "inversion"
  | "efectivo"
  | "cripto"
  | "otro";

type EditableAssetCategory = {
  id: string;
  name: string;
  display_order: number;
  type: AssetType;
};

export default function SettingsAssets() {
  const {
    assets,
    isLoading,
    isFetching,
    addAsset,
    renameAsset,
    changeAssetType,
    deleteAsset,
  } = useSettings();
  const loading = isLoading;
  const saving = isFetching;
  const [confirm, setConfirm] = useState<{
    open: boolean;
    categoryId: string | null;
    subcategoryId: string | null;
    scope: "asset" | null;
  }>({
    open: false,
    categoryId: null,
    subcategoryId: null,
    scope: null,
  });

  const sortedAssets = assets as EditableAssetCategory[];

  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetType, setNewAssetType] =
    useState<AssetType>("cuenta_bancaria");

  if (loading) {
    return (
      <div className="">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Separator />
        <ContentCardSkeleton headerWidth="w-60" contentClassName="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full sm:w-36" />
            <Skeleton className="h-10 w-full sm:w-28" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, rowIdx) => (
              <div key={`asset-row-${rowIdx}`} className="flex gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full sm:w-36" />
                <Skeleton className="h-10 w-20" />
              </div>
            ))}
          </div>
        </ContentCardSkeleton>
      </div>
    );
  }

  return (
    <div className="">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Activos patrimoniales</h1>
        <div className="text-sm text-muted-foreground">
          {saving ? "Guardando..." : ""}
        </div>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Configuración de activos</CardTitle>
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
                          onClick={() =>
                            setConfirm({
                              open: true,
                              categoryId: cat.id,
                              subcategoryId: null,
                              scope: "asset",
                            })
                          }
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

      <ConfirmDialog
        open={confirm.open}
        title={
          confirm.scope === "asset"
            ? "Eliminar activo"
            : confirm.subcategoryId
            ? "Eliminar subcategoría"
            : "Eliminar categoría"
        }
        description={
          confirm.scope === "asset"
            ? "Esta acción no se puede deshacer. ¿Seguro que quieres eliminar el activo?"
            : confirm.subcategoryId
            ? "Esta acción no se puede deshacer. ¿Seguro que quieres eliminar la subcategoría?"
            : "Esta acción no se puede deshacer. ¿Seguro que quieres eliminar la categoría?"
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (!confirm.scope) return;
          if (confirm.scope === "asset") {
            if (confirm.categoryId) {
              void deleteAsset.mutateAsync(confirm.categoryId);
            }
          }
          setConfirm({
            open: false,
            categoryId: null,
            subcategoryId: null,
            scope: null,
          });
        }}
        onClose={() =>
          setConfirm({
            open: false,
            categoryId: null,
            subcategoryId: null,
            scope: null,
          })
        }
      />
    </div>
  );
}
