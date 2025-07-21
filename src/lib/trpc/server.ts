import { initTRPC, TRPCError } from '@trpc/server'
import { ZodError } from 'zod'
import superjson from 'superjson'

// Create context for tRPC (App Router compatible)
export const createTRPCContext = (opts?: { req?: Request }) => {
  return {
    req: opts?.req,
    // Headers will be used by Supabase for session management
  }
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

// Base router and procedure helpers
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

// Protected procedure (will be implemented with auth)
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  // TODO: Implement auth check with Supabase
  // if (!ctx.user) {
  //   throw new TRPCError({ code: 'UNAUTHORIZED' })
  // }
  return next({
    ctx: {
      ...ctx,
      // user: ctx.user,
    },
  })
})
