import { useEffect, useState } from 'react'
import { Fish, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import '../auth.css'

function confirmationRedirectUrl() {
  if (typeof window === 'undefined') return undefined
  return `${window.location.origin}/`
}

function setGuestUi(enabled) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.xfishGuest = enabled ? 'true' : 'false'
}

function initialAuthError() {
  if (typeof window === 'undefined') return ''

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const description = hash.get('error_description') || query.get('error_description')

  return description ? `Verifica email non completata: ${description.replaceAll('+', ' ')}` : ''
}

function friendlyAuthError(error) {
  const message = error?.message || 'Operazione non riuscita. Riprova.'
  const normalized = message.toLowerCase()

  if (normalized.includes('email not confirmed')) {
    return 'La tua email non è ancora verificata. Puoi reinviare il messaggio di conferma qui sotto.'
  }

  if (normalized.includes('email address not authorized')) {
    return 'L’invio della mail di verifica non è disponibile per questo indirizzo nella configurazione email attuale.'
  }

  if (normalized.includes('rate limit')) {
    return 'Sono state richieste troppe email in poco tempo. Attendi circa un minuto e riprova.'
  }

  return message
}

export default function AuthPanel({ onGuest }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ displayName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [verificationPending, setVerificationPending] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState(initialAuthError)

  useEffect(() => {
    setGuestUi(false)
  }, [])

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  function enterGuestMode() {
    setGuestUi(true)
    onGuest()
  }

  async function resendVerification() {
    const email = form.email.trim()
    if (!supabase || !email || resending) return

    setResending(true)
    setMessage('')
    setErrorMessage('')

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: confirmationRedirectUrl(),
        },
      })
      if (error) throw error
      setVerificationPending(true)
      setMessage('Nuova mail inviata. Usa l’ultimo messaggio ricevuto: i link precedenti possono non essere più validi.')
    } catch (error) {
      setErrorMessage(friendlyAuthError(error))
    } finally {
      setResending(false)
    }
  }

  async function submit(event) {
    event.preventDefault()
    if (!supabase || loading) return

    setLoading(true)
    setMessage('')
    setErrorMessage('')

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: { display_name: form.displayName.trim() || form.email.split('@')[0] },
            emailRedirectTo: confirmationRedirectUrl(),
          },
        })
        if (error) throw error

        if (!data.session) {
          setVerificationPending(true)
          setMessage('Account creato. Ti abbiamo inviato una mail: aprila e conferma l’indirizzo per attivare l’accesso.')
        } else {
          setVerificationPending(false)
          setMessage('Account creato e accesso eseguito.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        })
        if (error) throw error
        setVerificationPending(false)
      }
    } catch (error) {
      const friendly = friendlyAuthError(error)
      if ((error?.message || '').toLowerCase().includes('email not confirmed')) {
        setVerificationPending(true)
      }
      setErrorMessage(friendly)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setMessage('')
    setErrorMessage('')
    setVerificationPending(false)
  }

  return (
    <div className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand-mark"><Fish size={34} /></div>
        <div className="eyebrow">XFish</div>
        <h1>{mode === 'login' ? 'Bentornato' : 'Crea il tuo profilo'}</h1>
        <p className="auth-copy">
          Salva catture, spot e attrezzatura nel cloud e ritrovali su telefono e computer.
        </p>

        <div className="auth-tabs" role="tablist" aria-label="Accesso o registrazione">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')} type="button">Accedi</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')} type="button">Registrati</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && (
            <label>
              <span>Nome</span>
              <div className="auth-field"><UserRound size={18} /><input value={form.displayName} onChange={update('displayName')} autoComplete="name" placeholder="Come vuoi essere chiamato" /></div>
            </label>
          )}

          <label>
            <span>Email</span>
            <div className="auth-field"><Mail size={18} /><input required type="email" value={form.email} onChange={update('email')} autoComplete="email" placeholder="nome@email.it" /></div>
          </label>

          <label>
            <span>Password</span>
            <div className="auth-field"><LockKeyhole size={18} /><input required minLength="6" type="password" value={form.password} onChange={update('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Almeno 6 caratteri" /></div>
          </label>

          {errorMessage && <div className="auth-message error">{errorMessage}</div>}
          {message && <div className="auth-message success">{message}</div>}

          <button className="primary-button full-width auth-submit" type="submit" disabled={loading}>
            {loading ? 'Attendi…' : mode === 'login' ? 'Accedi' : 'Crea account'}
          </button>

          {verificationPending && (
            <button className="secondary-button full-width" type="button" onClick={resendVerification} disabled={resending || !form.email.trim()}>
              {resending ? 'Invio…' : 'Reinvia mail di verifica'}
            </button>
          )}
        </form>

        <div className="auth-divider"><span>oppure</span></div>
        <button className="secondary-button full-width" type="button" onClick={enterGuestMode}>Continua come ospite</button>
        <p className="auth-footnote">In modalità ospite puoi consultare soltanto le previsioni meteo-marine. Per spot, diario, attrezzatura e statistiche è necessario accedere.</p>
      </section>
    </div>
  )
}
