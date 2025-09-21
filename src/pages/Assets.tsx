import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Wallet, TrendingUp, DollarSign, GripVertical } from "lucide-react";
import { useAssets, type AssetItem } from "@/hooks/use-assets";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const Assets = () => {
  const [editingCell, setEditingCell] = useState<string | null>(null);

  // months
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const { assets, swapOrder, updateAssetValue } = useAssets();

  type AssetRow = AssetItem & {
    icon: typeof Wallet;
    data: number[];
  };

  const assetCategories: AssetRow[] = useMemo(
    () =>
      (assets ?? []).map((c) => ({
        ...c,
        icon:
          c.type === "cuenta_bancaria"
            ? Wallet
            : c.type === "inversion"
            ? TrendingUp
            : DollarSign,
        data: c.monthly ?? new Array(12).fill(0),
      })),
    [assets]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = assetCategories;
    const fromIdx = current.findIndex((r) => r.id === active.id);
    const toIdx = current.findIndex((r) => r.id === over.id);
    if (fromIdx < 0 || toIdx < 0) return;
    const a = current[fromIdx];
    const b = current[toIdx];
    void swapOrder.mutateAsync({
      aId: a.id,
      aOrder: a.display_order,
      bId: b.id,
      bOrder: b.display_order,
    });
  }

  function RowHandle({ id }: { id: string }) {
    const { attributes, listeners } = useSortable({ id });
    return (
      <button
        aria-label="Mover"
        className="cursor-grab px-2"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  function SortableRow({ id, children }: { id: string; children: ReactNode }) {
    const { setNodeRef, transform, transition, isDragging } = useSortable({
      id,
    });
    const style: CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    };
    return (
      <tr
        ref={setNodeRef}
        style={style}
        id={id}
        className="border-b border-border/50 hover:bg-muted/30"
      >
        {children}
      </tr>
    );
  }

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "cuenta_bancaria":
        return { label: "Cuenta", color: "bg-info/20 text-info" };
      case "inversion":
        return { label: "Inversión", color: "bg-success/20 text-success" };
      case "efectivo":
        return { label: "Efectivo", color: "bg-muted text-muted-foreground" };
      case "cripto":
        return { label: "Crypto", color: "bg-warning/20 text-warning" };
      default:
        return { label: "Otro", color: "bg-muted text-muted-foreground" };
    }
  };

  // Totals row (per month) is shown at the bottom; global total not displayed
  const calculateColumnTotal = (monthIndex: number) => {
    return assetCategories.reduce(
      (sum, category) => sum + category.data[monthIndex],
      0
    );
  };

  // Cards should reflect the latest month with data. Compute last month index.
  const lastMonthIndex = useMemo(() => {
    for (let i = 11; i >= 0; i--) {
      const monthSum = assetCategories.reduce(
        (s, c) => s + (c.data[i] ?? 0),
        0
      );
      if (monthSum !== 0) return i;
    }
    return new Date().getMonth();
  }, [assetCategories]);

  const totalByTypeLastMonth = (type: string) =>
    assetCategories
      .filter((cat) => cat.type === type)
      .reduce((sum, cat) => sum + (cat.data[lastMonthIndex] ?? 0), 0);

  const handleCellEdit = async (
    categoryId: string,
    monthIndex: number,
    value: string
  ) => {
    const numericValue = parseFloat(value) || 0;
    const month = monthIndex + 1; // Convert to 1-based month

    try {
      await updateAssetValue.mutateAsync({
        categoryId,
        month,
        amount: numericValue,
      });
      console.log(
        `Successfully updated asset category ${categoryId}, month ${month}, value: ${numericValue}`
      );
    } catch (error) {
      console.error("Error updating asset value:", error);
      // TODO: Show error message to user
    }

    setEditingCell(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patrimonio</h1>
          <p className="text-muted-foreground">
            Gestiona el balance de tus activos financieros
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <SortableContext
            items={assetCategories.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-6"></th>
                  <th className="text-left p-3 font-semibold text-foreground min-w-[150px]">
                    Activo
                  </th>
                  <th className="text-left p-3 font-semibold text-foreground min-w-[80px]">
                    Tipo
                  </th>
                  {months.map((month) => (
                    <th
                      key={month}
                      className="text-center p-3 font-semibold text-foreground min-w-[80px]"
                    >
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assetCategories.map((category) => {
                  const typeConfig = getTypeConfig(category.type);
                  const IconComponent = category.icon;

                  return (
                    <SortableRow key={category.id} id={category.id}>
                      <td className="p-3 w-8 align-middle">
                        <RowHandle id={category.id} />
                      </td>
                      <td className="p-3 font-medium text-foreground flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        {category.name}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${typeConfig.color}`}
                        >
                          {typeConfig.label}
                        </span>
                      </td>
                      {category.data.map((value, monthIndex) => {
                        const cellKey = `${category.id}-${monthIndex}`;
                        const isEditing = editingCell === cellKey;

                        return (
                          <td key={monthIndex} className="p-1 text-center">
                            {isEditing ? (
                              <Input
                                type="number"
                                defaultValue={value}
                                className="w-16 h-8 text-center"
                                autoFocus
                                onBlur={(e) =>
                                  handleCellEdit(
                                    category.id,
                                    monthIndex,
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleCellEdit(
                                      category.id,
                                      monthIndex,
                                      e.currentTarget.value
                                    );
                                  }
                                  if (e.key === "Escape") {
                                    setEditingCell(null);
                                  }
                                }}
                              />
                            ) : (
                              <div
                                className="p-2 rounded cursor-pointer hover:bg-muted/50 text-primary font-medium"
                                onClick={() => setEditingCell(cellKey)}
                              >
                                €{value.toLocaleString()}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </SortableRow>
                  );
                })}

                <tr className="border-t-2 border-primary/20 bg-muted/20">
                  <td className="p-3 font-bold text-primary" colSpan={3}>
                    TOTAL
                  </td>
                  {months.map((_, monthIndex) => (
                    <td
                      key={monthIndex}
                      className="p-3 text-center font-bold text-primary"
                    >
                      €{calculateColumnTotal(monthIndex).toLocaleString()}
                    </td>
                  ))}
                  {/* No global total cell */}
                </tr>
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-info">
              €{totalByTypeLastMonth("cuenta_bancaria").toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Cuentas bancarias
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">
              €{totalByTypeLastMonth("inversion").toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Inversiones</div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">
              €{totalByTypeLastMonth("efectivo").toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Efectivo</div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              €
              {assetCategories
                .reduce((sum, cat) => sum + (cat.data[lastMonthIndex] ?? 0), 0)
                .toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Patrimonio total
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Assets;
