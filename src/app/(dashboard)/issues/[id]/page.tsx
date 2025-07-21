import { EntryDetail } from '@/components/entries/entry-detail'

interface EntryDetailPageProps {
  params: Promise<{
    id: string
  }>
}

/**
 * Entry detail page route
 * Displays full newsletter entry content with HTML rendering
 */
export default async function EntryDetailPage({ params }: EntryDetailPageProps) {
  const { id } = await params
  return <EntryDetail entryId={id} />
}

// Generate metadata for the page
export async function generateMetadata({ params }: EntryDetailPageProps) {
  const { id } = await params
  return {
    title: `Newsletter Entry - Lesefluss`,
    description: 'Newsletter-Eintrag im Detail',
  }
}
