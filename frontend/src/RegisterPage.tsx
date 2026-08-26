import { useState } from 'react'
import type { FormEvent } from 'react'
import { EyeIcon, HomeMark } from './LoginPage'
import { register, login, ApiError, type AuthUser } from './api'

const PASSWORD_REQUIREMENT =
  'The password must contain at least 8 characters, one uppercase letter, one number and one special character such as !, ?, or @.'

const PASSWORD_PATTERN =
  /^(?=.{8,100}$)(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).*$/

type RegisterPageProps = {
  onSignIn: () => void
  onRegister: (token: string, user: AuthUser) => void
}

export default function RegisterPage({ onSignIn, onRegister }: RegisterPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    if (data.get('password') !== data.get('confirmPassword')) {
      setMessage('')
      setError('The passwords do not match. Please try again.')
      return
    }

    setError('')
    setMessage('Creating your account...')
    setLoading(true)

    const name = String(data.get('name'))
    const email = String(data.get('email'))
    const password = String(data.get('password'))

    if (!PASSWORD_PATTERN.test(password)) {
      setMessage('')
      setError(`Invalid password. ${PASSWORD_REQUIREMENT}`)
      setLoading(false)
      return
    }

    try {
      await register(name, email, password)
      setMessage('Account created! Taking you to the app...')
      const response = await login(email, password)
      onRegister(response.accessToken, response.user)
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
    <main className="login-page register-page">
      <section className="welcome-panel register-welcome" aria-label="Smart Chores registration introduction">
        <div className="brand brand-light">
          <span className="brand-mark"><HomeMark /></span>
          <span>Smart Chores</span>
        </div>

        <div className="welcome-copy">
          <span className="eyebrow">Start sharing the load</span>
          <h1>Make home<br />feel lighter.</h1>
          <p>Create your account, bring your household together, and turn everyday chores into shared wins.</p>
          <div className="feature-list" aria-label="App benefits">
            <div><span>1</span> Create your free account</div>
            <div><span>2</span> Set up your household</div>
            <div><span>3</span> Invite members and assign chores</div>
          </div>
        </div>

        <p className="panel-note">Your organized home is only a minute away.</p>
        <span className="bubble bubble-one" />
        <span className="bubble bubble-two" />
        <span className="bubble bubble-three" />
      </section>

      <section className="form-panel register-panel">
        <div className="mobile-brand brand">
          <span className="brand-mark"><HomeMark /></span>
          <span>Smart Chores</span>
        </div>

        <div className="login-card register-card">
          <div className="login-heading register-heading">
            <span className="eyebrow">Join Smart Chores</span>
            <h2>Create your account</h2>
            <p>Set up your profile and start organizing your home.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="register-name">Full name</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 20c.5-4.2 3-6.5 7.5-6.5s7 2.3 7.5 6.5" /></svg>
              <input id="register-name" name="name" autoComplete="name" placeholder="Enter your full name" required />
            </div>

            <label className="field-label" htmlFor="email">Email address</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>
              <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
            </div>

            <label className="field-label" htmlFor="register-password">Password</label>
            {passwordFocused && (
              <p id="password-requirement" className="password-requirement" role="note">{PASSWORD_REQUIREMENT}</p>
            )}
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>
              <input id="register-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Password" minLength={8} required aria-describedby={passwordFocused ? 'password-requirement' : undefined} onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} />
              <button className="icon-button" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}><EyeIcon hidden={showPassword} /></button>
            </div>

            <label className="field-label" htmlFor="confirm-password">Confirm password</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>
              <input id="confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter your password again" minLength={8} required />
            </div>

            <label className="terms">
              <input type="checkbox" required />
              <span>I agree to the <button type="button" className="text-button">Terms</button> and <button type="button" className="text-button">Privacy Policy</button>.</span>
            </label>

            <button className="submit-button" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'} <span aria-hidden="true">→</span>
            </button>
            {error && <p className="form-message error-message" role="alert">{error}</p>}
            {message && !error && <p className="form-message" role="status">{message}</p>}
          </form>

          <p className="signup-prompt">Already have an account? <button type="button" className="text-button" onClick={onSignIn}>Sign in</button></p>
        </div>
        <p className="copyright">© 2026 Smart Chores. Better together.</p>
      </section>
    </main>
  )
}
