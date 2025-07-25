# shadcn/ui Theme Requirements

## Reference
- Official theme documentation: https://ui.shadcn.com/themes
- Official theming guide: https://ui.shadcn.com/docs/theming

## Color Variables
The Lesefluss app must follow the exact color variables as defined in the official shadcn/ui theme:

### Light Theme
```css
:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(222.2 84% 4.9%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(222.2 84% 4.9%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(222.2 84% 4.9%);
  --primary: hsl(346.8 77.2% 49.8%);
  --primary-foreground: hsl(355.7 100% 97.3%);
  --secondary: hsl(210 40% 96.1%);
  --secondary-foreground: hsl(222.2 47.4% 11.2%);
  --muted: hsl(210 40% 96.1%);
  --muted-foreground: hsl(215.4 16.3% 46.9%);
  --accent: hsl(210 40% 96.1%);
  --accent-foreground: hsl(222.2 47.4% 11.2%);
  --destructive: hsl(0 84.2% 60.2%);
  --destructive-foreground: hsl(210 40% 98%);
  --border: hsl(214.3 31.8% 91.4%);
  --input: hsl(214.3 31.8% 91.4%);
  --ring: hsl(222.2 84% 4.9%);
  --radius: 0.5rem;
}
```

### Dark Theme
```css
.dark {
  --background: hsl(222.2 84% 4.9%);
  --foreground: hsl(210 40% 98%);
  --card: hsl(222.2 84% 4.9%);
  --card-foreground: hsl(210 40% 98%);
  --popover: hsl(222.2 84% 4.9%);
  --popover-foreground: hsl(210 40% 98%);
  --primary: hsl(346.8 77.2% 49.8%);
  --primary-foreground: hsl(355.7 100% 97.3%);
  --secondary: hsl(217.2 32.6% 17.5%);
  --secondary-foreground: hsl(210 40% 98%);
  --muted: hsl(217.2 32.6% 17.5%);
  --muted-foreground: hsl(215 20.2% 65.1%);
  --accent: hsl(217.2 32.6% 17.5%);
  --accent-foreground: hsl(210 40% 98%);
  --destructive: hsl(0 62.8% 30.6%);
  --destructive-foreground: hsl(210 40% 98%);
  --border: hsl(217.2 32.6% 17.5%);
  --input: hsl(217.2 32.6% 17.5%);
  --ring: hsl(212.7 26.8% 83.9%);
}
```

## Important Notes

### Border Styling
- Standard border: `border-border` (uses the --border CSS variable)
- Primary border: `border-primary` (uses the --primary CSS variable)
- Do NOT use opacity modifiers like `border-border/50` as these are not part of the official shadcn/ui theme

### Hover States
- Official shadcn/ui components use specific hover classes defined in their component files
- Do NOT create custom hover effects with opacity modifiers
- For card hover effects, refer to the official Card component implementation

### Card Component
- Use the official Card, CardHeader, CardTitle, CardDescription, CardContent, and CardFooter components
- Do not add custom border styling that overrides the default Card styling
- For highlighting unread entries, use the `border-primary` class without additional modifications

## Component-Specific Notes

### EnhancedEntryCard
- Use `border-primary` for unread entries
- Use `border-border` for read entries
- Do NOT use `hover:border-border/50` or any opacity modifiers
- For hover effects, consider using the standard hover classes from shadcn/ui
