import { trpc } from "@/lib/trpc";
import { useCallback, useMemo } from "react";

export function useAuth() {
  const utils = trpc.useUtils();
  const meQuery = trpc.estate.auth.me.useQuery();
  const logoutMutation = trpc.estate.auth.logout.useMutation({
    onSuccess: () => utils.estate.auth.me.setData(undefined, null),
  });

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    await utils.estate.auth.me.invalidate();
  }, [logoutMutation, utils]);

  return useMemo(() => ({
    user: meQuery.data ?? null,
    loading: meQuery.isLoading || logoutMutation.isPending,
    error: meQuery.error ?? logoutMutation.error ?? null,
    isAuthenticated: Boolean(meQuery.data),
    refresh: () => meQuery.refetch(),
    logout,
  }), [meQuery.data, meQuery.error, meQuery.isLoading, meQuery.refetch, logout, logoutMutation.error, logoutMutation.isPending]);
}
