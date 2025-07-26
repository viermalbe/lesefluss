import { redirect } from 'next/navigation'

interface EntryDetailPageProps {
  params: Promise<{
    id: string
  }>
}

/**
 * Redirect from archived entry detail page to issues entry detail page
 * This ensures backward compatibility with existing URLs
 */
export default async function ArchivedEntryDetailPage({ params }: EntryDetailPageProps) {
  const { id } = await params
  
  // Redirect to issues page with archive filter
  redirect(`/issues/${id}?filter=archive`)
}
