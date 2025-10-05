import { useSortable } from "@dnd-kit/sortable";

type RowHandleProps = {
  id: string;
};

export function RowHandle({ id }: RowHandleProps) {
  const { attributes, listeners } = useSortable({ id });
  return (
    <button
      aria-label="Mover"
      className="cursor-grab px-1"
      {...attributes}
      {...listeners}
    >
      ≡
    </button>
  );
}
