import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface TablePaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onLimitChange: (pageSize: number) => void;
  showPageSizeSelector?: boolean;
  showPageInfo?: boolean;
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  pagination,
  onPageChange,
  onLimitChange,
  showPageSizeSelector = true,
  showPageInfo = true,
  className = "",
}) => {
  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize = 20,
    hasNextPage,
    hasPreviousPage,
  } = pagination;

  // Generate page numbers to show
  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const pageNumbers: (number | "...")[] = [];

    // Always show first page
    pageNumbers.push(1);

    // Show pages around current page
    const startPage = Math.max(2, currentPage - delta);
    const endPage = Math.min(totalPages - 1, currentPage + delta);

    // Add ellipsis if there's a gap
    if (startPage > 2) {
      pageNumbers.push("...");
    }

    // Add pages around current page
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    // Add ellipsis if there's a gap
    if (endPage < totalPages - 1) {
      pageNumbers.push("...");
    }

    // Always show last page (if it's not the first page)
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }

    // Remove duplicates
    return pageNumbers.filter(
      (page, index, arr) => index === 0 || page !== arr[index - 1]
    );
  };

  const pageNumbers = getPageNumbers();

  if (totalPages <= 1 && !showPageInfo && !showPageSizeSelector) {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-between space-x-6 lg:space-x-8 px-2 py-4 ${className}`}
    >
      {/* Page size selector */}
      {showPageSizeSelector && (
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Filas por página</p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onLimitChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[80px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Page info */}
      {showPageInfo && (
        <div className="flex items-center justify-center text-sm font-medium">
          Página {currentPage} de {totalPages} ({totalItems}{" "}
          {totalItems === 1 ? "elemento" : "elementos"})
        </div>
      )}

      {/* Navigation controls */}
      <div className="flex items-center space-x-2">
        {/* First page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(1)}
          disabled={!hasPreviousPage}
          title="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-1">
            {pageNumbers.map((page, index) => (
              <React.Fragment key={index}>
                {page === "..." ? (
                  <span className="px-2 py-1 text-sm text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8"
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Next page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          title="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage}
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
