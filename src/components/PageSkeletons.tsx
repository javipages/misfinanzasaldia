import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageHeaderSkeletonProps {
  actions?: number;
  descriptionLines?: number;
  className?: string;
}

export function PageHeaderSkeleton({
  actions = 1,
  descriptionLines = 1,
  className,
}: PageHeaderSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-2 w-full">
        <Skeleton className="h-8 w-48 max-w-full" />
        {Array.from({ length: descriptionLines }).map((_, idx) => (
          <Skeleton
            key={`description-${idx}`}
            className="h-4 w-[min(20rem,100%)] max-w-full"
          />
        ))}
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        {Array.from({ length: actions }).map((_, idx) => (
          <Skeleton
            key={`action-${idx}`}
            className="h-10 w-full sm:w-40"
          />
        ))}
      </div>
    </div>
  );
}

interface SummaryCardsSkeletonProps {
  count?: number;
  columnsClassName?: string;
  cardClassName?: string;
}

export function SummaryCardsSkeleton({
  count = 4,
  columnsClassName = "md:grid-cols-2 xl:grid-cols-4",
  cardClassName,
}: SummaryCardsSkeletonProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        columnsClassName
      )}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx} className={cn("shadow-card", cardClassName)}>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface ContentCardSkeletonProps {
  headerWidth?: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function ContentCardSkeleton({
  headerWidth = "w-40",
  className,
  contentClassName,
  children,
}: ContentCardSkeletonProps) {
  return (
    <Card className={cn("shadow-card", className)}>
      <CardHeader>
        <Skeleton className={cn("h-6", headerWidth)} />
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  columnClassName?: string;
  hideHeader?: boolean;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  columnClassName = "grid grid-cols-2 gap-3 md:grid-cols-4",
  hideHeader = false,
}: TableSkeletonProps) {
  const columnArray = Array.from({ length: columns });

  return (
    <div className="space-y-3">
      {!hideHeader && (
        <div className={columnClassName}>
          {columnArray.map((_, idx) => (
            <Skeleton key={`header-${idx}`} className="h-4 w-full" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={`row-${rowIdx}`} className={columnClassName}>
          {columnArray.map((_, colIdx) => (
            <Skeleton key={`cell-${rowIdx}-${colIdx}`} className="h-6 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
