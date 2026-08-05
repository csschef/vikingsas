import app from '../server/app.js'

// Vercel gör varje fil i api/ till en egen function. Vi vill bara ha en,
// så koden ligger i server/ och den här filen är bara ingången.
export default app
