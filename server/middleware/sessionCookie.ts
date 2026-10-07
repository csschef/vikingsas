import type { Request, Response, NextFunction } from 'express'

export function sessionCookie(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies.session_id) {
    const sessionId = crypto.randomUUID()
    res.cookie('session_id', sessionId, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 })
    req.cookies.session_id = sessionId
  }
  next()
}
