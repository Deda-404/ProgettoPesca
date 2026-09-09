import { useState } from 'react'
import { Fish, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AuthPanel({ onGuest }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ displayName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

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
          },
        })
        if (error) throw error
        if (!data.session) {
          setMessage('Account creato. Controlla la tua email per confermare la registrazione.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        })
        if (error) throw error
      }
    } catch (error) {
      setErrorMessage(error?.message || 'Operazione non riuscita. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand-mark"><Fish size={34} /></div>
        <div className="eyebrow">Progetto Pesca</div>
        <h1>{mode === 'login' ? 'Bentornato' : 'Crea il tuo profilo'}</h1>
        <p className="auth-copy">
          Salva catture, spot e attrezzatura nel cloud e ritrovali su telefono e computer.
        </p>

        <div className="auth-tabs" role="tablist" aria-label="Accesso o registrazione">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">Accedi</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">Registrati</button>
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
        </form>

        <div className="auth-divider"><span>oppure</span></div>
        <button className="secondary-button full-width" type="button" onClick={onGuest}>Continua come ospite</button>
        <p className="auth-footnote">In modalità ospite i dati restano salvati soltanto su questo dispositivo.</p>
      </section>
    </div>
  )
}
