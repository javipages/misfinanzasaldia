import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type YearContextType = {
  year: number;
  setYear: (y: number) => void;
};

const YearContext = createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: ReactNode }) {
  const initial =
    Number(localStorage.getItem("app.year")) || new Date().getFullYear();
  const [year, setYearState] = useState<number>(initial);
  const setYear = (y: number) => {
    setYearState(y);
    localStorage.setItem("app.year", String(y));
  };
  const value = useMemo(() => ({ year, setYear }), [year]);
  return <YearContext.Provider value={value}>{children}</YearContext.Provider>;
}

export function useYear() {
  const ctx = useContext(YearContext);
  if (!ctx) throw new Error("useYear must be used within YearProvider");
  return ctx;
}
