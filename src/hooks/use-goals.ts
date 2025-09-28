import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "@/store/user";
import {
  listGoalsForYear,
  createGoalRow,
  updateGoalRow,
  deleteGoalRow,
  type GoalRow,
  type GoalInput,
} from "@/integrations/supabase/categories";

export type Goal = GoalRow;

export const useGoals = () => {
  const { year } = useUserStore();
  const qc = useQueryClient();
  const QK = useMemo(
    () => ({ goals: (y: number) => ["goals", y] as const }),
    []
  );

  const goalsQuery = useQuery({
    queryKey: QK.goals(year),
    queryFn: async () => listGoalsForYear(year),
  });

  const createGoal = useMutation({
    mutationFn: async (goal: GoalInput) => createGoalRow(goal),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.goals(year) });
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<GoalInput>;
    }) => updateGoalRow(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.goals(year) });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => deleteGoalRow(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.goals(year) });
    },
  });

  return {
    goals: goalsQuery.data ?? [],
    loading: goalsQuery.isLoading,
    error: goalsQuery.error ? String(goalsQuery.error) : null,
    createGoal: createGoal.mutateAsync,
    updateGoal: async (id: string, patch: Partial<GoalInput>) =>
      updateGoal.mutateAsync({ id, patch }),
    deleteGoal: deleteGoal.mutateAsync,
    refetchGoals: goalsQuery.refetch,
  };
};
