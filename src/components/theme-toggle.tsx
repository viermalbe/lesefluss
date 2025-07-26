'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Nach dem Mounting den Status aktualisieren
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Wenn nicht gemounted, ein leeres Icon anzeigen, um Layout-Shifts zu vermeiden
  if (!mounted) {
    return (
      <Button variant="ghost" size="sm">
        <div className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  // Explizit das richtige Icon basierend auf dem aktuellen Theme anzeigen
  const isLightTheme = theme === 'light'
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(isLightTheme ? 'dark' : 'light')}
          >
            {isLightTheme ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            <span className="sr-only">
              {isLightTheme ? 'Switch to dark mode' : 'Switch to light mode'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isLightTheme ? 'Dark mode' : 'Light mode'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
