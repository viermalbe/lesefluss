## Relevant Files

- `src/components/entries/entry-detail.tsx` – Main component for newsletter display
- `src/lib/utils/newsletter-parser.ts` – HTML parsing and transformation logic mit cheerio
- `src/lib/gpt-transformer.ts` – OpenAI GPT integration for Read Mode
- `src/hooks/useNewsletterMode.ts` – Hook for mode switching and persistence
- `src/styles/newsletter-view.css` – CSS for View Mode styling
- `src/styles/newsletter-read.css` – CSS for Read Mode styling
- `src/components/ui/mode-toggle.tsx` – Toggle component for switching modes
- `src/app/api/transform-newsletter/route.ts` – API route for GPT transformations
- `supabase/migrations/**` – SQL migrations for new `read_mode_html` field

### Notes

- The newsletter viewer needs to handle both desktop and mobile views
- Two distinct modes: View Mode (original layout) and Read Mode (clean reading)
- Mode preference is stored globally in localStorage
- GPT-4 is used for transforming HTML to clean reading format
- Fallback mechanisms needed for failed transformations

## Tasks

- [ ] **1.0 HTML Parsing & View Mode Implementation**
  - [x] **1.1 Create newsletter parser utility with cheerio**
  - [x] **1.2 Implement responsive transformations for tables and images**
  - [x] **1.3 Create newsletter wrapper component with proper CSS reset**
  - [ ] 1.4 Add device-specific viewport adaptations
  - [ ] 1.5 Test View Mode with various newsletter formats
- [ ] **2.0 Read Mode Implementation with GPT**
  - [ ] 2.1 Create OpenAI API integration for HTML transformation
  - [ ] 2.2 Design prompt template for optimal HTML conversion
  - [ ] 2.3 Implement error handling and fallbacks
  - [ ] 2.4 Create Read Mode CSS styling
  - [ ] 2.5 Add caching mechanism for transformed content
- [ ] **3.0 Database & Storage Updates**
  - [ ] 3.1 Add `read_mode_html` field to entries table
  - [ ] 3.2 Update entry creation flow to include GPT transformation
  - [ ] 3.3 Create migration script for existing entries
  - [ ] 3.4 Implement storage optimization for large HTML content
- [ ] **4.0 UI Components & Mode Switching**
  - [ ] 4.1 Create mode toggle component (View/Read)
  - [ ] 4.2 Implement localStorage persistence for mode preference
  - [ ] 4.3 Add visual indicators for current mode
  - [ ] 4.4 Ensure smooth transition between modes
- [ ] **5.0 Error Handling & Fallbacks**
  - [ ] 5.1 Create sanitize-html fallback for failed GPT transformations
  - [ ] 5.2 Implement error notifications for users
  - [ ] 5.3 Add logging for failed transformations
  - [ ] 5.4 Create retry mechanism for transformation failures
- [ ] **6.0 Integration & Testing**
  - [ ] 6.1 Integrate with GitHub Actions for automated processing
  - [ ] 6.2 Test with various newsletter formats and edge cases
  - [ ] 6.3 Optimize performance for large newsletters
  - [ ] 6.4 Ensure accessibility in both modes
