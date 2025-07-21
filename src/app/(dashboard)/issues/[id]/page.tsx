import { EntryDetail } from '@/components/entries/entry-detail'

interface EntryDetailPageProps {
  params: {
    id: string
  }
}

/**
 * Entry detail page route
 * Displays full newsletter entry content with HTML rendering
 */
export default function EntryDetailPage({ params }: EntryDetailPageProps) {
  return <EntryDetail entryId={params.id} />
}

// Generate metadata for the page
export async function generateMetadata({ params }: EntryDetailPageProps) {
  return {
    title: `Newsletter Entry - Lesefluss`,
    description: 'Newsletter-Eintrag im Detail',
  }
}
