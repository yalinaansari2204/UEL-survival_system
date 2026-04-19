import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { seededAcademicModules } from './seed.js'

/** Seeded on first read if missing — local/demo only. Change password in production. */
export const BUILTIN_ADMIN_EMAIL = 'admin@uel.local'
export const BUILTIN_ADMIN_PASSWORD = 'admin123'

const dataDir = path.resolve('server', 'storage')
const dbFile = path.join(dataDir, 'db.json')

const defaultDb = {
  users: [],
  preferences: {},
  sessions: [],
  modules: seededAcademicModules,
  students: [],
  auditLogs: [],
  moodleConfig: {
    baseUrl: '',
    token: '',
    enabled: false,
  },
  notes: [],
  tasks: [],
  weekMaterials: [],
}

const ensureDb = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(defaultDb, null, 2), 'utf8')
  }
}

const readDb = () => {
  ensureDb()
  try {
    const raw = fs.readFileSync(dbFile, 'utf8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.modules)) {
      parsed.modules = [...seededAcademicModules]
      writeDb(parsed)
    }
    if (!Array.isArray(parsed.students)) parsed.students = []
    if (!Array.isArray(parsed.auditLogs)) parsed.auditLogs = []
    if (!parsed.moodleConfig) {
      parsed.moodleConfig = { baseUrl: '', token: '', enabled: false }
    }
    if (!Array.isArray(parsed.notes)) parsed.notes = []
    if (!Array.isArray(parsed.tasks)) parsed.tasks = []
    if (!Array.isArray(parsed.weekMaterials)) parsed.weekMaterials = []
    ensureBuiltInAdmin(parsed)
    return parsed
  } catch {
    fs.writeFileSync(dbFile, JSON.stringify(defaultDb, null, 2), 'utf8')
    const recovered = JSON.parse(fs.readFileSync(dbFile, 'utf8'))
    ensureBuiltInAdmin(recovered)
    return recovered
  }
}

const writeDb = (db) => {
  ensureDb()
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8')
}

const ensureBuiltInAdmin = (db) => {
  if (!Array.isArray(db.users)) db.users = []
  const exists = db.users.some((u) => u.email.toLowerCase() === BUILTIN_ADMIN_EMAIL.toLowerCase())
  if (exists) return
  const modId = db.modules?.[0]?.id ?? null
  const admin = {
    id: crypto.randomUUID(),
    name: 'UEL Admin',
    email: BUILTIN_ADMIN_EMAIL,
    passwordHash: bcrypt.hashSync(BUILTIN_ADMIN_PASSWORD, 10),
    university: 'UEL',
    role: 'admin',
    createdAt: new Date().toISOString(),
  }
  db.users.push(admin)
  if (!db.preferences || typeof db.preferences !== 'object') db.preferences = {}
  db.preferences[admin.id] = { selectedModule: modId, theme: 'light' }
  writeDb(db)
}

export const getUserByEmail = (email) => {
  const db = readDb()
  return db.users.find((user) => user.email.toLowerCase() === email.toLowerCase())
}

export const addUser = (user) => {
  const db = readDb()
  db.users.push(user)
  db.preferences[user.id] = { selectedModule: 'programming' }
  writeDb(db)
}

export const getUserById = (id) => {
  const db = readDb()
  return db.users.find((user) => user.id === id)
}

export const getAllModules = () => {
  const db = readDb()
  return db.modules || []
}

export const addModule = (payload) => {
  const db = readDb()
  const module = {
    id: crypto.randomUUID(),
    academicYear: payload.academicYear || '2025/6',
    code: payload.code || 'NEW000',
    title: payload.title || 'New Module',
    level: Number(payload.level || 6),
    term: Number(payload.term || 1),
    grade: payload.grade ?? null,
    status: payload.status || 'In Progress',
    assessments: Array.isArray(payload.assessments) ? payload.assessments : [],
  }
  db.modules = [...(db.modules || []), module]
  writeDb(db)
  return module
}

export const addModulesBulk = (payloads) => {
  const db = readDb()
  const created = payloads.map((payload) => ({
    id: crypto.randomUUID(),
    academicYear: payload.academicYear || '2025/6',
    code: payload.code || 'NEW000',
    title: payload.title || 'New Module',
    level: Number(payload.level || 6),
    term: Number(payload.term || 1),
    grade: payload.grade ?? null,
    status: payload.status || 'In Progress',
    assessments: Array.isArray(payload.assessments) ? payload.assessments : [],
  }))
  db.modules = [...(db.modules || []), ...created]
  writeDb(db)
  return created
}

export const updateModule = (id, updates) => {
  const db = readDb()
  const index = (db.modules || []).findIndex((module) => module.id === id)
  if (index < 0) return null
  db.modules[index] = { ...db.modules[index], ...updates }
  writeDb(db)
  return db.modules[index]
}

export const deleteModule = (id) => {
  const db = readDb()
  const before = (db.modules || []).length
  db.modules = (db.modules || []).filter((module) => module.id !== id)
  writeDb(db)
  return before !== db.modules.length
}

export const getPreferences = (userId) => {
  const db = readDb()
  return db.preferences[userId] || { selectedModule: 'programming' }
}

export const savePreferences = (userId, preferences) => {
  const db = readDb()
  db.preferences[userId] = { ...(db.preferences[userId] || {}), ...preferences }
  writeDb(db)
  return db.preferences[userId]
}

export const saveSessionRecord = (record) => {
  const db = readDb()
  db.sessions.push(record)
  writeDb(db)
}

export const getUserSessions = (userId) => {
  const db = readDb()
  return db.sessions.filter((item) => item.userId === userId).slice(-20)
}

export const getAllStudents = () => {
  const db = readDb()
  return db.students || []
}

export const addStudent = (payload) => {
  const db = readDb()
  const student = {
    id: crypto.randomUUID(),
    name: payload.name || 'New Student',
    email: payload.email || '',
    studentId: payload.studentId || '',
    course: payload.course || 'Computing',
    level: Number(payload.level || 6),
    intake: payload.intake || '2025/6',
    status: payload.status || 'Active',
  }
  db.students = [...(db.students || []), student]
  writeDb(db)
  return student
}

export const updateStudent = (id, updates) => {
  const db = readDb()
  const index = (db.students || []).findIndex((student) => student.id === id)
  if (index < 0) return null
  db.students[index] = { ...db.students[index], ...updates }
  writeDb(db)
  return db.students[index]
}

export const deleteStudent = (id) => {
  const db = readDb()
  const before = (db.students || []).length
  db.students = (db.students || []).filter((student) => student.id !== id)
  writeDb(db)
  return before !== db.students.length
}

export const addAuditLog = (payload) => {
  const db = readDb()
  const record = {
    id: crypto.randomUUID(),
    actorId: payload.actorId,
    actorName: payload.actorName,
    actorRole: payload.actorRole,
    action: payload.action,
    targetType: payload.targetType,
    targetId: payload.targetId || null,
    detail: payload.detail || '',
    createdAt: new Date().toISOString(),
  }
  db.auditLogs = [record, ...(db.auditLogs || [])].slice(0, 200)
  writeDb(db)
  return record
}

export const getAuditLogs = () => {
  const db = readDb()
  return db.auditLogs || []
}

export const getMoodleConfig = () => {
  const db = readDb()
  return db.moodleConfig || { baseUrl: '', token: '', enabled: false }
}

export const saveMoodleConfig = (config) => {
  const db = readDb()
  db.moodleConfig = {
    baseUrl: String(config.baseUrl || '').trim(),
    token: String(config.token || '').trim(),
    enabled: Boolean(config.enabled),
  }
  writeDb(db)
  return db.moodleConfig
}

export const upsertNote = ({ userId, moduleId, week, content }) => {
  const db = readDb()
  const index = (db.notes || []).findIndex(
    (note) => note.userId === userId && note.moduleId === moduleId && Number(note.week) === Number(week),
  )
  const record = {
    id: index >= 0 ? db.notes[index].id : crypto.randomUUID(),
    userId,
    moduleId,
    week: Number(week),
    content: String(content || ''),
    updatedAt: new Date().toISOString(),
  }
  if (index >= 0) db.notes[index] = record
  else db.notes.push(record)
  writeDb(db)
  return record
}

export const getNotesForUser = (userId) => {
  const db = readDb()
  return (db.notes || []).filter((note) => note.userId === userId)
}

export const addTask = ({ userId, title, moduleId = null, week = null, dueDate = null, priority = 'Medium' }) => {
  const db = readDb()
  const task = {
    id: crypto.randomUUID(),
    userId,
    title: String(title || '').trim(),
    moduleId: moduleId || null,
    week: week === null || week === '' ? null : Number(week),
    dueDate: dueDate ? String(dueDate) : null,
    priority,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  db.tasks.push(task)
  writeDb(db)
  return task
}

export const getTasksForUser = (userId) => {
  const db = readDb()
  return (db.tasks || []).filter((task) => task.userId === userId)
}

export const updateTask = (userId, id, updates) => {
  const db = readDb()
  const index = (db.tasks || []).findIndex((task) => task.id === id && task.userId === userId)
  if (index < 0) return null
  db.tasks[index] = { ...db.tasks[index], ...updates, updatedAt: new Date().toISOString() }
  writeDb(db)
  return db.tasks[index]
}

export const deleteTask = (userId, id) => {
  const db = readDb()
  const before = (db.tasks || []).length
  db.tasks = (db.tasks || []).filter((task) => !(task.id === id && task.userId === userId))
  writeDb(db)
  return before !== db.tasks.length
}

export const addWeekMaterial = ({ userId, moduleId, week, storedName, originalName }) => {
  const db = readDb()
  const record = {
    id: crypto.randomUUID(),
    userId,
    moduleId,
    week: Number(week),
    storedName,
    originalName: originalName || storedName,
    createdAt: new Date().toISOString(),
  }
  db.weekMaterials = [...(db.weekMaterials || []), record]
  writeDb(db)
  return record
}

export const getWeekMaterials = (userId, moduleId, week) => {
  const db = readDb()
  return (db.weekMaterials || []).filter(
    (m) => m.userId === userId && m.moduleId === moduleId && Number(m.week) === Number(week),
  )
}

export const getWeekMaterialById = (userId, id) => {
  const db = readDb()
  return (db.weekMaterials || []).find((m) => m.id === id && m.userId === userId) || null
}

export const deleteWeekMaterial = (userId, id) => {
  const db = readDb()
  const before = (db.weekMaterials || []).length
  db.weekMaterials = (db.weekMaterials || []).filter((m) => !(m.id === id && m.userId === userId))
  writeDb(db)
  return before !== db.weekMaterials.length
}
