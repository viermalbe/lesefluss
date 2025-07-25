import { Header } from '@/components/navigation/header'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto">
        {children}
      </main>
      
      <footer className="bg-background">
        <div className="container-wrapper px-4 xl:px-6">
          <div className="flex h-[--footer-height] items-center justify-between">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Lesefluss
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
