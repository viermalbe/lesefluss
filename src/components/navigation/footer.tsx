'use client'

import Link from 'next/link'
import { Signature } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-background">
      <div className="container-wrapper px-4 xl:px-6">
        <div className="flex h-[--footer-height] items-center justify-between">
          <div className="flex items-center space-x-2">
            <Signature className="h-5 w-5" />
            <span className="font-medium">Lesefluss</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Lesefluss
          </div>
        </div>
      </div>
    </footer>
  )
}
