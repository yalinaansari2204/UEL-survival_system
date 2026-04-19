import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { addUser, getUserByEmail } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'uel-survival-dev-secret'
const TOKEN_EXPIRY = '7d'

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  university: user.university,
  role: user.role || 'student',
  createdAt: user.createdAt,
})

export const registerUser = async ({ name, email, password, university, role }) => {
  const existing = getUserByEmail(email)
  if (existing) {
    throw new Error('Email already registered')
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash,
    university: university || 'UEL',
    role: role === 'admin' ? 'admin' : 'student',
    createdAt: new Date().toISOString(),
  }
  addUser(user)
  return sanitizeUser(user)
}

export const loginUser = async ({ email, password }) => {
  const user = getUserByEmail(email)
  if (!user) throw new Error('Invalid email or password')
  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) throw new Error('Invalid email or password')
  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
  return { token, user: sanitizeUser(user) }
}

export const verifyToken = (token) => jwt.verify(token, JWT_SECRET)
