'use client'

import { useActionState } from 'react'

import { login, type LoginState } from './actions'

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {})
  return (
    <form action={action} className="card" noValidate>
      {state.error && (
        <div className="alert alert--danger" role="alert">
          <p>{state.error}</p>
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">Пароль</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
        {pending ? 'Проверяем…' : 'Войти'}
      </button>
    </form>
  )
}
