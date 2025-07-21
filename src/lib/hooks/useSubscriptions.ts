import { api } from '@/lib/trpc/client'

export function useSubscriptions() {
  const {
    data: subscriptions = [],
    isLoading: loading,
    error,
    refetch,
  } = api.subscription.getAll.useQuery()

  const createMutation = api.subscription.create.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const updateMutation = api.subscription.update.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const deleteMutation = api.subscription.delete.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const createSubscription = async (title: string) => {
    return createMutation.mutateAsync({ title })
  }

  const updateSubscription = async (id: string, title: string) => {
    return updateMutation.mutateAsync({ id, title })
  }

  const deleteSubscription = async (id: string) => {
    return deleteMutation.mutateAsync({ id })
  }

  return {
    subscriptions,
    loading,
    error: error?.message || null,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
