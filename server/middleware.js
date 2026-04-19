import { getUserById } from './db.js'
import { verifyToken } from './auth.js'

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const payload = verifyToken(token)
    const user = getUserById(payload.sub)
    if (!user) {
      res.status(401).json({ error: 'Invalid user' })
      return
    }
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role || 'student' }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  next()
}
