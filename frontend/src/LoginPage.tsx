import type { AuthUser } from './api'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { login, ApiError } from './api'

export function HomeMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M7 22.5 24 8l17 14.5v17A3.5 3.5 0 0 1 37.5 43h-27A3.5 3.5 0 0 1 7 39.5v-17Z" />
      <path d="M18 43V29h12v14M31.5 13.8v-4h5v8.3" />
      <path className="spark" d="m36.5 27 1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2 1.2-2.8Z" />
    </svg>
  )
}

export function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.5" />
      {hidden && <path d="m4 4 16 16" />}
    </svg>
  )
}

type LoginPageProps = {
  onCreateAccount: () => void
  onLogin: (token: string, user: AuthUser) => void
}

export default function LoginPage({ onCreateAccount, onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('Signing you in...')
    setLoading(true)

    const data = new FormData(event.currentTarget)
    const email = String(data.get('email'))
    const password = String(data.get('password'))

    try {
      const response = await login(email, password)
      setMessage('Welcome back! Redirecting...')
      onLogin(response.accessToken, response.user)
    } catch (err) {
      setMessage('')
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="welcome-panel" aria-label="Smart Chores introduction">
        <div className="brand brand-light">
          <span className="brand-mark"><HomeMark /></span>
          <span>Smart Chores</span>
        </div>

        <div className="welcome-copy">
          <span className="eyebrow">A happier home starts here</span>
          <h1>Less reminding.<br />More living.</h1>
          <p>Keep your household in sync, share the load, and make every completed chore count.</p>

          <div className="feature-list" aria-label="App benefits">
            <div><span>✓</span> Create and organize your household</div>
            <div><span>✓</span> Assign tasks in just a few taps</div>
            <div><span>✓</span> Celebrate progress together</div>
          </div>
        </div>

        <p className="panel-note">A little teamwork makes a big difference.</p>
        <span className="bubble bubble-one" />
        <span className="bubble bubble-two" />
        <span className="bubble bubble-three" />
      </section>

      <section className="form-panel">
        <div className="mobile-brand brand">
          <span className="brand-mark"><HomeMark /></span>
          <span>Smart Chores</span>
        </div>

        <div className="login-card">
          <div className="login-heading">
            <span className="eyebrow">Welcome back</span>
            <h2>Sign in to your home</h2>
            <p>Enter your details to pick up where you left off.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>
              <input id="email" name="email" type="email" autoComplete="email" placeholder="Enter your email" required />
            </div>

            <div className="password-label">
              <label htmlFor="password">Password</label>
              <button type="button" className="text-button">Forgot password?</button>
            </div>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" required />
              <button className="icon-button" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                <EyeIcon hidden={showPassword} />
              </button>
            </div>

            <label className="remember">
              <input type="checkbox" name="remember" />
              <span>Keep me signed in</span>
            </label>

            <button className="submit-button" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'} <span aria-hidden="true">→</span>
            </button>
            {error && <p className="form-message error-message" role="alert">{error}</p>}
            {message && !error && <p className="form-message" role="status">{message}</p>}
          </form>

          <p className="signup-prompt">New to Smart Chores? <button type="button" className="text-button" onClick={onCreateAccount}>Create an account</button></p>
        </div>
        <p className="copyright">© 2026 Smart Chores. Better together.</p>
      </section>
    </main>
  )
}
