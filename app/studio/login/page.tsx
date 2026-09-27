import type { Metadata } from 'next'
import { LoginForm } from './login-form'
import { Wordmark } from '@/components/ui'

export const metadata: Metadata = { title: 'Studio sign in' }

export default async function StudioLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="flex w-full max-w-[400px] flex-col gap-10">
        <div className="flex items-baseline gap-2">
          <Wordmark className="text-[30px]" />
          <span className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">Studio</span>
        </div>
        <LoginForm
          next={next}
          demo={
            process.env.STUDIO_SHOW_DEMO_LOGIN === 'false'
              ? null
              : { email: process.env.STUDIO_DEMO_EMAIL ?? 'owner@odara.demo', password: process.env.STUDIO_DEMO_PASSWORD ?? 'odara-demo' }
          }
        />
      </div>
    </div>
  )
}
