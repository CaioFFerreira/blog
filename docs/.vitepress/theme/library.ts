export type ReadingStatus = 'want_read' | 'reading' | 'read'
export interface LibraryBook {
  id: string
  owner_id: string
  title: string
  author: string
  pdf_path: string
  status: ReadingStatus
  last_page: number
  created_at: string
}
export interface LibraryFriend {
  friendship_id: string
  other_id: string
  display_name: string
  status: 'pending' | 'accepted'
  direction: 'sent' | 'received'
}
export const bookFields = 'id,owner_id,title,author,pdf_path,created_at'
export type BookWithProgress = Omit<LibraryBook, 'status' | 'last_page'> & {
  reading?: { status: ReadingStatus; last_page: number }[]
}
export function withReadingProgress(book: BookWithProgress): LibraryBook {
  const { reading, ...metadata } = book
  return { ...metadata, status: reading?.[0]?.status ?? 'want_read', last_page: reading?.[0]?.last_page ?? 1 }
}
export const statusLabels: Record<ReadingStatus, string> = {
  want_read: 'Quero ler', reading: 'Lendo', read: 'Lido',
}
export const pdfBucket = 'library-pdfs'
export const maxPdfBytes = 50 * 1024 * 1024
export const normalizeSearch = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export async function validatePdf(file: File): Promise<string | null> {
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'Escolha um arquivo PDF.'
  if (file.size > maxPdfBytes) return 'O PDF deve ter no máximo 50 MB.'
  const signature = await file.slice(0, 5).text()
  if (signature !== '%PDF-') return 'Este arquivo não parece ser um PDF válido.'
  return null
}
