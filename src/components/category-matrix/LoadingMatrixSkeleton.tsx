import { Skeleton } from "@/components/ui/skeleton";
import { MONTHS } from "@/utils/constants";

export function LoadingMatrixSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="p-3 text-left">
              <Skeleton className="h-4 w-32" />
            </th>
            {MONTHS.map((month) => (
              <th key={month} className="p-3 text-center">
                <Skeleton className="h-4 w-16 mx-auto" />
              </th>
            ))}
            <th className="p-3 text-center">
              <Skeleton className="h-4 w-20 mx-auto" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 4 }).map((_, rowIdx) => (
            <tr
              key={`loading-row-${rowIdx}`}
              className="border-b border-border/50"
            >
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-6 w-6 hidden md:block" />
                </div>
              </td>
              {MONTHS.map((month) => (
                <td key={`${month}-${rowIdx}`} className="p-2">
                  <Skeleton className="h-6 w-full" />
                </td>
              ))}
              <td className="p-3 text-center">
                <Skeleton className="h-6 w-16 mx-auto" />
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-border bg-muted/20">
            <td className="p-3">
              <Skeleton className="h-4 w-20" />
            </td>
            {MONTHS.map((month) => (
              <td key={`total-${month}`} className="p-3">
                <Skeleton className="h-4 w-12 mx-auto" />
              </td>
            ))}
            <td className="p-3 text-center">
              <Skeleton className="h-4 w-16 mx-auto" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
