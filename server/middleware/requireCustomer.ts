import type { Request, Response, NextFunction } from 'express'

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  if (!req.session.customerId) {
    return res.status(401).json({ status: 'fel', error: 'Logga in för att se dina beställningar' })
  }
  next()
}
