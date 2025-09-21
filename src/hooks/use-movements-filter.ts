import { useState, useMemo, useEffect } from "react";
import { type MovementRow, type MovementType } from "./use-movements";

export type SortField = "date" | "amount" | "category" | "type" | "description";
export type SortDirection = "asc" | "desc";

export interface MovementsFilterState {
  searchTerm: string;
  typeFilter: MovementType | "all";
  monthFilter: string;
  categoryFilter: string;
  dateFromFilter: string;
  dateToFilter: string;
  sortField: SortField;
  sortDirection: SortDirection;
  selectedSortValue: SortField;
  sortKey: string;
  currentPage: number;
  pageSize: number;
}

export interface MovementsFilterResult {
  // Estado
  filterState: MovementsFilterState;
  filteredMovements: MovementRow[];
  paginatedMovements: MovementRow[];
  paginationInfo: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  stats: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    movementsCount: number;
    incomeCount: number;
    expenseCount: number;
  };

  // Acciones
  setSearchTerm: (term: string) => void;
  setTypeFilter: (type: MovementType | "all") => void;
  setMonthFilter: (month: string) => void;
  setCategoryFilter: (category: string) => void;
  setDateFromFilter: (date: string) => void;
  setDateToFilter: (date: string) => void;
  setSortField: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  handleSort: (field: SortField) => void;
  handleSortChange: (field: SortField) => void;
  resetPagination: () => void;

  // Utilidades
  formatCurrency: (amount: number) => string;
  selectedSortValue: SortField;
}

export function useMovementsFilter(
  movements: MovementRow[]
): MovementsFilterResult {
  // Estado de filtrado
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovementType | "all">("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Estado para el valor seleccionado en el Select de ordenar
  const [selectedSortValue, setSelectedSortValue] = useState<SortField>("date");

  // Estado interno para forzar re-render cuando cambie la ordenación
  const [sortKey, setSortKey] = useState<string>(
    `${sortField}-${sortDirection}`
  );

  // Estado de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Sincronizar selectedSortValue con sortField
  useEffect(() => {
    setSelectedSortValue(sortField);
  }, [sortField]);

  // Función para manejar cambios en el dropdown de ordenar
  const handleSortChange = (field: SortField) => {
    let newDirection: SortDirection = "asc";
    if (sortField === field) {
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    }
    setSortField(field);
    setSortDirection(newDirection);
    setSelectedSortValue(field);
    setSortKey(`${field}-${newDirection}`);
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    typeFilter,
    monthFilter,
    categoryFilter,
    dateFromFilter,
    dateToFilter,
    sortField,
    sortDirection,
  ]);

  // Lógica de filtrado
  const filteredMovements = useMemo(() => {
    let filtered = movements;

    // Filtro por tipo
    if (typeFilter !== "all") {
      filtered = filtered.filter((m) => m.type === typeFilter);
    }

    // Filtro por mes
    if (monthFilter !== "all") {
      const monthNum = parseInt(monthFilter);
      filtered = filtered.filter((m) => m.month === monthNum);
    }

    // Filtro por rango de fechas
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      filtered = filtered.filter((m) => {
        const movementDate = new Date(m.year, m.month - 1, 1);
        return movementDate >= fromDate;
      });
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      filtered = filtered.filter((m) => {
        const movementDate = new Date(m.year, m.month - 1, 1);
        return movementDate <= toDate;
      });
    }

    // Filtro por categoría
    if (categoryFilter !== "all") {
      filtered = filtered.filter((m) => m.category_name === categoryFilter);
    }

    // Búsqueda por texto
    if (searchTerm) {
      filtered = filtered.filter(
        (m) =>
          m.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.category_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar
    filtered.sort((a, b) => {
      let aValue: number | string | Date, bValue: number | string | Date;

      switch (sortField) {
        case "date":
          aValue = new Date(a.year, a.month - 1, 1);
          bValue = new Date(b.year, b.month - 1, 1);
          break;
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        case "category":
          aValue = a.category_name || "";
          bValue = b.category_name || "";
          break;
        case "type":
          // Priorizar orden específico para tipos: expense primero, luego income
          aValue = a.type === "expense" ? 0 : 1;
          bValue = b.type === "expense" ? 0 : 1;
          break;
        case "description":
          aValue = a.description || "";
          bValue = b.description || "";
          break;
        default:
          return 0;
      }

      // Comparación más robusta
      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    movements,
    searchTerm,
    typeFilter,
    monthFilter,
    categoryFilter,
    dateFromFilter,
    dateToFilter,
    sortField,
    sortDirection,
  ]);

  // Estadísticas
  const stats = useMemo(() => {
    const income = filteredMovements.filter((m) => m.type === "income");
    const expenses = filteredMovements.filter((m) => m.type === "expense");

    const totalIncome = income.reduce((sum, m) => sum + m.amount, 0);
    const totalExpenses = expenses.reduce((sum, m) => sum + m.amount, 0);
    const balance = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      balance,
      movementsCount: filteredMovements.length,
      incomeCount: income.length,
      expenseCount: expenses.length,
    };
  }, [filteredMovements]);

  // Paginación
  const paginationInfo = useMemo(() => {
    const totalItems = filteredMovements.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      currentPage,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  }, [filteredMovements.length, currentPage, pageSize]);

  const paginatedMovements = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredMovements.slice(startIndex, endIndex);
  }, [filteredMovements, currentPage, pageSize]);

  // Funciones de manejo
  const handleSort = (field: SortField) => {
    let newDirection: SortDirection = "asc";
    if (sortField === field) {
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    }
    setSortField(field);
    setSortDirection(newDirection);
    setSelectedSortValue(field);
    setSortKey(`${field}-${newDirection}`);
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Utilidades
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Estado completo para devolver
  const filterState: MovementsFilterState = {
    searchTerm,
    typeFilter,
    monthFilter,
    categoryFilter,
    dateFromFilter,
    dateToFilter,
    sortField,
    sortDirection,
    selectedSortValue,
    sortKey,
    currentPage,
    pageSize,
  };

  return {
    // Estado
    filterState,
    filteredMovements,
    paginatedMovements,
    paginationInfo,
    stats,

    // Acciones
    setSearchTerm,
    setTypeFilter,
    setMonthFilter,
    setCategoryFilter,
    setDateFromFilter,
    setDateToFilter,
    setSortField,
    setSortDirection,
    setCurrentPage,
    setPageSize,
    handleSort,
    handleSortChange,
    resetPagination,

    // Utilidades
    formatCurrency,
    selectedSortValue,
  };
}
