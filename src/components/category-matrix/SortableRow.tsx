import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import type React from "react";

type SortableRowProps = {
  id: string;
  children: React.ReactNode;
  className?: string;
};

export function SortableRow({
  id,
  children,
  className = "",
}: SortableRowProps) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  } as React.CSSProperties;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      id={id}
      className={`border-b border-border/50 hover:bg-muted/30 ${className}`}
    >
      {children}
    </tr>
  );
}
