'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuthContext } from '@/components/providers/auth-provider'
import { Signature, LogOut, Settings2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function Header() {
  const pathname = usePathname()
  const { user, signOut } = useAuthContext()

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Logo - Linksbündig */}
        <div className="flex">
          <Link href="/issues?filter=all" className="flex items-center space-x-2">
            <Signature className="h-6 w-6" />
            <span className="font-bold">
              Lesefluss
            </span>
          </Link>
        </div>

        {/* Rechtsbündige Icons: Sources, Theme, Sign out */}
        <div className="ml-auto flex items-center space-x-1">
          {/* Sources Icon */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/sources">
                    <Settings2 className="h-5 w-5" />
                    <span className="sr-only">Sources</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sources</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Sign Out Button */}
          {user && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (confirm('Are you sure you want to sign out?')) {
                      signOut()
                    }
                  }}>
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Sign out</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sign out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </header>
  )
}
