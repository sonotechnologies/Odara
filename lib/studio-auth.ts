import 'server-only'
import { redirect } from 'next/navigation'
import { getStudioSession } from '@/lib/session'

/** Call at the top of every studio page and action. */
export async function requireOwner() {
  const s = await getStudioSession()
  if (!s) redirect('/studio/login')
  return s
}
