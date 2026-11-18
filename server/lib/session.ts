import type { Request } from 'express'

type LoggedIn = {
  userId?: number
  customerId?: number
}

// Ny session med nytt id vid varje in- och utloggning. Den gamla raderas ur databasen,
// så ett id som någon har kommit över slutar fungera. Admin och kund kan vara inloggade i samma webbläsare.
export function renewSession(req: Request, loggedIn: LoggedIn): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ingen kvar inloggad. Annars sparar express-session en tom session med det nya id:t.
    if (!loggedIn.userId && !loggedIn.customerId) {
      return req.session.destroy((error) => (error ? reject(error) : resolve()))
    }
    req.session.regenerate((error) => {
      if (error) return reject(error)
      if (loggedIn.userId) req.session.userId = loggedIn.userId
      if (loggedIn.customerId) req.session.customerId = loggedIn.customerId
      // Sparas före svaret, så att sessionen finns när webbläsaren gör nästa anrop
      req.session.save((saveError) => (saveError ? reject(saveError) : resolve()))
    })
  })
}
