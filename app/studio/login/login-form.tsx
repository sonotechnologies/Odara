'use client'

import { useActionState } from 'react'
import { login, type LoginState } from '../actions'
import { btn, cx, Spinner } from '@/components/ui'

export function LoginForm({ next, demo }: { next?: string; demo: { email: string; password: string } | null }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {})
  const field = cx('h-[52px] border-0 border-b bg-transparent text-base outline-none focus:border-b-2 focus:border-ink', state.error ? 'border-rust' : 'border-stone')
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="next" value={next ?? ''} />
      {demo && (
        <div className="bg-olive-mist p-4 text-[13px] leading-[1.6] text-olive">
          <div className="font-medium">Demo login</div>
          This is a portfolio demo, so the credentials are right here: <span className="font-mono">{demo.email}</span> /{' '}
          <span className="font-mono">{demo.password}</span>
        </div>
      )}
      <label className="flex flex-col gap-1.5 text-[13px] text-ink-soft">
        Email
        <input name="email" type="email" autoComplete="username" defaultValue={demo?.email} className={field} />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] text-ink-soft">
        Password
        <input name="password" type="password" autoComplete="current-password" defaultValue={demo?.password} className={field} />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-rust">
          {state.error}
        </p>
      )}
      <button disabled={pending} className={btn.primary}>
        {pending && <Spinner />}
        Sign in
      </button>
    </form>
  )
}
