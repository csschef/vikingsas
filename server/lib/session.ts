import type { Request } from 'express'

type LoggedIn = {
  userId?: number
  customerId?: number
}

// Ny session med nytt id vid varje in- och utloggning. Den gamla raderas ur databasen,
// så ett id som någon har kommit över slutar fungera. Admin och kund kan vara inloggade i samma webbläsare.
export function renewSession(req: Request, loggedIn: LoggedIn): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error)
      if (loggedIn.userId) req.session.userId = loggedIn.userId
      if (loggedIn.customerId) req.session.customerId = loggedIn.customerId
      if (!loggedIn.userId && !loggedIn.customerId) return resolve()
      // Sparas före svaret, så att sessionen finns när webbläsaren gör nästa anrop
      req.session.save((saveError) => (saveError ? reject(saveError) : resolve()))
    })
  })
}
