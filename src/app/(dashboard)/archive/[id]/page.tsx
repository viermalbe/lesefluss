import { EntryDetail } from '@/components/entries/entry-detail'

interface EntryDetailPageProps {
  params: Promise<{
    id: string
  }>
}

/**
 * Archived entry detail page route
 * Displays full archived newsletter entry content with HTML rendering
 */
export default async function ArchivedEntryDetailPage({ params }: EntryDetailPageProps) {
  const { id } = await params
  return <EntryDetail entryId={id} />
}

// Generate metadata for the page
export async function generateMetadata({ params }: EntryDetailPageProps) {
  const { id } = await params
  return {
    title: `Archived Newsletter Entry - Lesefluss`,
    description: 'Archivierter Newsletter-Eintrag im Detail',
  }
}
