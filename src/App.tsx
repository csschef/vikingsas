import { useEffect, useState } from 'react'

// Tillfällig sida som visar att React når API:et. Byts ut mot produktlistan.
function App() {
  const [status, setStatus] = useState('kollar...')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('inget svar från API:et'))
  }, [])

  return (
    <main>
      <h1>Chilisåser</h1>
      <p>API: {status}</p>
    </main>
  )
}

export default App
