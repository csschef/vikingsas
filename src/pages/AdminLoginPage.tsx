import { useState, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router'

function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Fel e-post eller lösenord')
        }
        navigate('/admin/ordrar')
      })
      .catch(() => {
        setError('Fel e-post eller lösenord')
      })
  }

  return (
    <main className="admin-login-page">
      <h1>Logga in</h1>
      <form onSubmit={handleSubmit}>
        <label>
          E-post:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Lösenord:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit">Logga in</button>
      </form>
    </main>
  )
}

export default AdminLoginPage
