'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuthContext } from '@/components/providers/auth-provider'
import { AddSourceDialog } from '@/components/sources/add-source-dialog'
import { BookOpen, Menu as MenuIcon, Plus, Settings, User, LogOut, Archive, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export function Header() {
  const pathname = usePathname()
  const { user, signOut } = useAuthContext()

  const navigation = [
    { name: 'Issues', href: '/issues', icon: BookOpen },
    { name: 'Archive', href: '/archive', icon: Archive },
    { name: 'Sources', href: '/sources', icon: MenuIcon },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Logo */}
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <BookOpen className="h-6 w-6" />
            <span className="font-bold">
              Lesefluss
            </span>
          </Link>
        </div>

        {/* Navigation - Hidden on mobile, visible on desktop */}
        <nav className="hidden sm:flex items-center space-x-6 text-sm font-medium">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 transition-colors hover:text-foreground/80 ${
                  isActive ? 'text-foreground' : 'text-foreground/60'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right side - Desktop: Theme + User, Mobile: Hamburger */}
        <div className="ml-auto flex items-center space-x-2">
          {/* Desktop Controls */}
          <div className="hidden sm:flex items-center space-x-2">
            <ThemeToggle />
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                    <span className="sr-only">User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    <User className="mr-2 h-4 w-4" />
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">
                  <User className="h-4 w-4" />
                  <span className="sr-only">Sign in</span>
                </Link>
              </Button>
            )}
          </div>
          
          {/* Mobile Menu (Hamburger) */}
          <div className="sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-1">
                  <MenuIcon className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
                <SheetDescription className="sr-only">Navigation menu</SheetDescription>
                <div className="p-6 border-b">
                  <SheetHeader>
                    <SheetTitle className="flex items-center">
                      <BookOpen className="h-5 w-5 mr-2" />
                      Lesefluss
                    </SheetTitle>
                    {user && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {user.email}
                      </p>
                    )}
                  </SheetHeader>
                </div>
                
                <div className="py-4 px-4">
                  <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Navigation
                  </h3>
                  <nav className="flex flex-col space-y-1">
                    {navigation.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      
                      return (
                        <SheetClose asChild key={item.href}>
                          <Link
                            href={item.href}
                            className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                              isActive 
                                ? 'bg-accent text-accent-foreground font-medium' 
                                : 'hover:bg-accent/50'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.name}</span>
                          </Link>
                        </SheetClose>
                      )
                    })}
                  </nav>
                  
                  <h3 className="mt-6 mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </h3>
                  <div className="flex flex-col space-y-1">
                    <SheetClose asChild>
                      <Link
                        href="/settings"
                        className="flex items-center space-x-3 p-2 rounded-md transition-colors hover:bg-accent/50"
                      >
                        <Settings className="h-5 w-5" />
                        <span>Settings</span>
                      </Link>
                    </SheetClose>
                    
                    <div className="flex items-center space-x-3 p-2 rounded-md transition-colors hover:bg-accent/50">
                      <div className="flex-shrink-0">
                        {/* Placeholder icon with same dimensions for alignment */}
                        <div className="h-5 w-5 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="4"></circle>
                            <path d="M12 2v2"></path>
                            <path d="M12 20v2"></path>
                            <path d="m4.93 4.93 1.41 1.41"></path>
                            <path d="m17.66 17.66 1.41 1.41"></path>
                            <path d="M2 12h2"></path>
                            <path d="M20 12h2"></path>
                            <path d="m6.34 17.66-1.41 1.41"></path>
                            <path d="m19.07 4.93-1.41 1.41"></path>
                          </svg>
                        </div>
                      </div>
                      <span>Appearance</span>
                      <div className="ml-auto">
                        <ThemeToggle />
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        // Close sheet and sign out
                        setTimeout(() => signOut(), 150)
                      }}
                      className="w-full flex items-center space-x-3 p-2 rounded-md transition-colors hover:bg-accent/50 text-left"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
                
                <div className="mt-auto p-4 border-t text-center text-xs text-muted-foreground">
                  <p>© 2025 Lesefluss</p>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
