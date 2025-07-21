import { createTRPCRouter } from './server'
import { subscriptionRouter } from './routers/subscription'
import { entryRouter } from './routers/entry'

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/trpc should be manually added here.
 */
export const appRouter = createTRPCRouter({
  subscription: subscriptionRouter,
  entry: entryRouter,
})

// Export type definition of API
export type AppRouter = typeof appRouter
