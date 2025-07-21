import { api } from '@/lib/trpc/client'
import type { EntryFilters, Pagination } from '@/lib/schemas'

export function useEntries(filters?: EntryFilters, pagination?: Pagination) {
  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = api.entry.getAll.useQuery({ filters, pagination })

  const updateStatusMutation = api.entry.updateStatus.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const toggleStarMutation = api.entry.toggleStar.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const archiveMutation = api.entry.archive.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const updateEntryStatus = async (id: string, status: 'read' | 'unread') => {
    return updateStatusMutation.mutateAsync({ id, status })
  }

  const toggleStar = async (id: string) => {
    return toggleStarMutation.mutateAsync({ id })
  }

  const archiveEntry = async (id: string) => {
    return archiveMutation.mutateAsync({ id })
  }

  return {
    entries: data?.entries || [],
    loading,
    error: error?.message || null,
    hasMore: data?.hasMore || false,
    total: data?.total || 0,
    updateEntryStatus,
    toggleStar,
    archiveEntry,
    isUpdatingStatus: updateStatusMutation.isPending,
    isTogglingstar: toggleStarMutation.isPending,
    isArchiving: archiveMutation.isPending,
  }
}
