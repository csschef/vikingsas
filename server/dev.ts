import app from './app.js'

// Endast för lokal utveckling. Vercel kör aldrig den här filen.
const port = Number(process.env.PORT ?? 3000)

app.listen(port, () => {
  console.log(`API kör på http://localhost:${port}`)
})
