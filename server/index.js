import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loginUser, registerUser } from './auth.js'
import {
  addAuditLog,
  addModule,
  addModulesBulk,
  addStudent,
  addTask,
  deleteModule,
  deleteStudent,
  deleteTask,
  getAllModules,
  getAllStudents,
  getAuditLogs,
  getMoodleConfig,
  getNotesForUser,
  getPreferences,
  getTasksForUser,
  getUserSessions,
  saveMoodleConfig,
  savePreferences,
  saveSessionRecord,
  updateTask,
  updateStudent,
  updateModule,
  upsertNote,
} from './db.js'
import {
  diagnoseMoodleConnection,
  fetchMoodleCourses,
  generateMoodleToken,
  testMoodleConnection,
} from './moodle.js'
import { buildSyntheticData } from './data.js'
import { requireAdmin, requireAuth } from './middleware.js'
import { registerWeekMaterialRoutes } from './weekMaterials.js'

const app = express()
const PORT = Number(process.env.PORT || 3001)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.resolve(__dirname, '../dist')

app.use(cors())
app.use(express.json())
registerWeekMaterialRoutes(app)

const focusSessions = {}

const getFocusSession = (userId) =>
  focusSessions[userId] || {
    active: false,
    moduleId: null,
    startedAt: null,
    elapsedSeconds: 0,
  }

const getElapsed = (session) => {
  if (!session.active || !session.startedAt) return session.elapsedSeconds
  const live = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
  return session.elapsedSeconds + Math.max(0, live)
}

const logAdminAction = (req, action, targetType, targetId, detail) => {
  addAuditLog({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action,
    targetType,
    targetId,
    detail,
  })
}

const parseModulesCsv = (csvText) => {
  const rows = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (rows.length < 2) return []
  const [header, ...dataRows] = rows
  const columns = header.split(',').map((x) => x.trim().toLowerCase())
  const idx = (name) => columns.indexOf(name)
  return dataRows.map((row) => {
    const cells = row.split(',').map((x) => x.trim())
    return {
      academicYear: cells[idx('academicyear')] || cells[idx('year')] || '2025/6',
      code: cells[idx('code')] || 'NEW000',
      title: cells[idx('title')] || 'Imported Module',
      level: Number(cells[idx('level')] || 6),
      term: Number(cells[idx('term')] || 1),
      grade: cells[idx('grade')] ? Number(cells[idx('grade')]) : null,
      status: cells[idx('status')] || 'In Progress',
      assessments: cells[idx('assessments')]
        ? cells[idx('assessments')]
            .split('|')
            .map((x) => x.trim())
            .filter(Boolean)
        : [],
    }
  })
}

app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'UEL Survival System API' })
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, university, role } = req.body || {}
    if (!name || !email || !password) {
      res.status(400).json({ error: 'name, email, and password are required' })
      return
    }
    const user = await registerUser({ name, email, password, university, role })
    const loginResult = await loginUser({ email, password })
    res.status(201).json({ user, token: loginResult.token })
  } catch (err) {
    res.status(400).json({ error: err.message || 'Registration failed' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' })
      return
    }
    const result = await loginUser({ email, password })
    res.json(result)
  } catch (err) {
    res.status(401).json({ error: err.message || 'Login failed' })
  }
})

app.get('/api/me', requireAuth, (req, res) => {
  const preferences = getPreferences(req.user.id)
  res.json({ user: req.user, preferences })
})

app.get('/api/data', requireAuth, (req, res) => {
  const data = buildSyntheticData({
    sessionCount: getUserSessions(req.user.id).length,
    sourceModules: getAllModules(),
  })
  res.json(data)
})

app.post('/api/assistant/recommendation', requireAuth, (req, res) => {
  const data = buildSyntheticData({
    sessionCount: getUserSessions(req.user.id).length,
    sourceModules: getAllModules(),
  })
  res.json(data.assistant.recommendation)
})

app.get('/api/weekly-guide', requireAuth, (req, res) => {
  const data = buildSyntheticData({
    sessionCount: getUserSessions(req.user.id).length,
    sourceModules: getAllModules(),
  })
  res.json({ tasks: data.assistant.weeklyGuide })
})

app.get('/api/focus-session', requireAuth, (req, res) => {
  const session = getFocusSession(req.user.id)
  res.json({ ...session, elapsedSeconds: getElapsed(session) })
})

app.post('/api/focus-session/start', requireAuth, (req, res) => {
  const session = getFocusSession(req.user.id)
  const { moduleId } = req.body || {}
  if (!moduleId) {
    res.status(400).json({ error: 'moduleId is required' })
    return
  }
  if (session.active) {
    res.status(409).json({ error: 'A focus session is already active' })
    return
  }
  focusSessions[req.user.id] = {
    ...session,
    active: true,
    moduleId,
    startedAt: new Date().toISOString(),
  }
  res.json({ ...focusSessions[req.user.id], elapsedSeconds: getElapsed(focusSessions[req.user.id]) })
})

app.post('/api/focus-session/pause', requireAuth, (req, res) => {
  const session = getFocusSession(req.user.id)
  if (!session.active) {
    res.status(409).json({ error: 'No active session to pause' })
    return
  }
  focusSessions[req.user.id] = {
    ...session,
    active: false,
    elapsedSeconds: getElapsed(session),
    startedAt: null,
  }
  if (focusSessions[req.user.id].moduleId && focusSessions[req.user.id].elapsedSeconds >= 60) {
    saveSessionRecord({
      userId: req.user.id,
      moduleId: focusSessions[req.user.id].moduleId,
      durationSeconds: focusSessions[req.user.id].elapsedSeconds,
      endedAt: new Date().toISOString(),
    })
  }
  res.json({ ...focusSessions[req.user.id], elapsedSeconds: focusSessions[req.user.id].elapsedSeconds })
})

app.post('/api/focus-session/reset', requireAuth, (req, res) => {
  const session = getFocusSession(req.user.id)
  if (session.moduleId && getElapsed(session) >= 60) {
    saveSessionRecord({
      userId: req.user.id,
      moduleId: session.moduleId,
      durationSeconds: getElapsed(session),
      endedAt: new Date().toISOString(),
    })
  }
  focusSessions[req.user.id] = {
    active: false,
    moduleId: null,
    startedAt: null,
    elapsedSeconds: 0,
  }
  res.json(focusSessions[req.user.id])
})

app.get('/api/preferences', requireAuth, (req, res) => {
  res.json(getPreferences(req.user.id))
})

app.put('/api/preferences', requireAuth, (req, res) => {
  const saved = savePreferences(req.user.id, req.body || {})
  res.json(saved)
})

app.get('/api/notes', requireAuth, (req, res) => {
  res.json(getNotesForUser(req.user.id))
})

app.put('/api/notes', requireAuth, (req, res) => {
  const { moduleId, week, content } = req.body || {}
  if (!moduleId || !week) {
    res.status(400).json({ error: 'moduleId and week are required' })
    return
  }
  res.json(upsertNote({ userId: req.user.id, moduleId, week, content }))
})

app.get('/api/tasks', requireAuth, (req, res) => {
  res.json(getTasksForUser(req.user.id))
})

app.post('/api/tasks', requireAuth, (req, res) => {
  const { title, moduleId, week, dueDate, priority } = req.body || {}
  if (!title) {
    res.status(400).json({ error: 'title is required' })
    return
  }
  res.status(201).json(addTask({ userId: req.user.id, title, moduleId, week, dueDate, priority }))
})

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const updated = updateTask(req.user.id, req.params.id, req.body || {})
  if (!updated) {
    res.status(404).json({ error: 'Task not found' })
    return
  }
  res.json(updated)
})

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  const deleted = deleteTask(req.user.id, req.params.id)
  if (!deleted) {
    res.status(404).json({ error: 'Task not found' })
    return
  }
  res.status(204).send()
})

app.get('/api/sessions', requireAuth, (req, res) => {
  res.json(getUserSessions(req.user.id))
})

app.get('/api/admin/modules', requireAuth, requireAdmin, (_req, res) => {
  res.json(getAllModules())
})

app.post('/api/admin/modules', requireAuth, requireAdmin, (req, res) => {
  const created = addModule(req.body || {})
  logAdminAction(req, 'create', 'module', created.id, `Created module ${created.code}`)
  res.status(201).json(created)
})

app.put('/api/admin/modules/:id', requireAuth, requireAdmin, (req, res) => {
  const updated = updateModule(req.params.id, req.body || {})
  if (!updated) {
    res.status(404).json({ error: 'Module not found' })
    return
  }
  logAdminAction(req, 'update', 'module', updated.id, `Updated module ${updated.code}`)
  res.json(updated)
})

app.delete('/api/admin/modules/:id', requireAuth, requireAdmin, (req, res) => {
  const deleted = deleteModule(req.params.id)
  if (!deleted) {
    res.status(404).json({ error: 'Module not found' })
    return
  }
  logAdminAction(req, 'delete', 'module', req.params.id, 'Deleted module')
  res.status(204).send()
})

app.post('/api/admin/modules/import-csv', requireAuth, requireAdmin, (req, res) => {
  const csvText = req.body?.csv || ''
  if (!csvText) {
    res.status(400).json({ error: 'csv is required' })
    return
  }
  const parsed = parseModulesCsv(csvText)
  if (parsed.length === 0) {
    res.status(400).json({ error: 'No rows parsed from CSV' })
    return
  }
  const created = addModulesBulk(parsed)
  logAdminAction(req, 'bulk_import', 'module', null, `Imported ${created.length} modules from CSV`)
  res.status(201).json({ imported: created.length, modules: created })
})

app.get('/api/admin/students', requireAuth, requireAdmin, (_req, res) => {
  res.json(getAllStudents())
})

app.post('/api/admin/students', requireAuth, requireAdmin, (req, res) => {
  const created = addStudent(req.body || {})
  logAdminAction(req, 'create', 'student', created.id, `Created student ${created.name}`)
  res.status(201).json(created)
})

app.put('/api/admin/students/:id', requireAuth, requireAdmin, (req, res) => {
  const updated = updateStudent(req.params.id, req.body || {})
  if (!updated) {
    res.status(404).json({ error: 'Student not found' })
    return
  }
  logAdminAction(req, 'update', 'student', updated.id, `Updated student ${updated.name}`)
  res.json(updated)
})

app.delete('/api/admin/students/:id', requireAuth, requireAdmin, (req, res) => {
  const deleted = deleteStudent(req.params.id)
  if (!deleted) {
    res.status(404).json({ error: 'Student not found' })
    return
  }
  logAdminAction(req, 'delete', 'student', req.params.id, 'Deleted student')
  res.status(204).send()
})

app.get('/api/admin/audit-logs', requireAuth, requireAdmin, (_req, res) => {
  res.json(getAuditLogs())
})

app.get('/api/admin/moodle/config', requireAuth, requireAdmin, (_req, res) => {
  const config = getMoodleConfig()
  res.json({ ...config, token: config.token ? '********' : '' })
})

app.put('/api/admin/moodle/config', requireAuth, requireAdmin, (req, res) => {
  const previous = getMoodleConfig()
  const incomingToken = String(req.body?.token || '').trim()
  const next = saveMoodleConfig({
    baseUrl: req.body?.baseUrl || '',
    token: incomingToken || previous.token,
    enabled: req.body?.enabled ?? true,
  })
  logAdminAction(req, 'update', 'moodle', null, 'Updated Moodle connector configuration')
  res.json({ ...next, token: next.token ? '********' : '' })
})

app.post('/api/admin/moodle/test', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const config = getMoodleConfig()
    if (!config.baseUrl || !config.token) {
      res.status(400).json({ error: 'Moodle baseUrl and token must be configured first' })
      return
    }
    const info = await testMoodleConnection(config)
    logAdminAction(_req, 'test_connection', 'moodle', null, `Tested Moodle connection for ${info.siteName}`)
    res.json({ ok: true, info })
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'Moodle test failed' })
  }
})

app.post('/api/admin/moodle/import-courses', requireAuth, requireAdmin, async (req, res) => {
  try {
    const config = getMoodleConfig()
    if (!config.baseUrl || !config.token) {
      res.status(400).json({ error: 'Moodle baseUrl and token must be configured first' })
      return
    }
    const imported = await fetchMoodleCourses(config)
    if (imported.length === 0) {
      res.status(200).json({ imported: 0, modules: [] })
      return
    }
    const created = addModulesBulk(imported)
    logAdminAction(req, 'bulk_import', 'moodle', null, `Imported ${created.length} courses from Moodle`)
    res.status(201).json({ imported: created.length, modules: created })
  } catch (err) {
    res.status(400).json({ error: err.message || 'Moodle import failed' })
  }
})

app.post('/api/admin/moodle/generate-token', requireAuth, requireAdmin, async (req, res) => {
  try {
    const config = getMoodleConfig()
    const baseUrl = req.body?.baseUrl || config.baseUrl
    const { username, password, service } = req.body || {}
    if (!baseUrl || !username || !password) {
      res.status(400).json({ error: 'baseUrl, username, and password are required' })
      return
    }
    const token = await generateMoodleToken({
      baseUrl,
      username,
      password,
      service: service || 'moodle_mobile_app',
    })
    const saved = saveMoodleConfig({
      ...config,
      baseUrl,
      token,
      enabled: true,
    })
    logAdminAction(req, 'generate_token', 'moodle', null, 'Generated Moodle token via username/password')
    res.json({ ok: true, tokenMasked: '********', config: { ...saved, token: '********' } })
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to generate token' })
  }
})

app.post('/api/admin/moodle/diagnose', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const config = getMoodleConfig()
    if (!config.baseUrl || !config.token) {
      res.status(400).json({ error: 'Moodle baseUrl and token must be configured first' })
      return
    }
    const result = await diagnoseMoodleConnection(config)
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message || 'Diagnostics failed' })
  }
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use((err, _req, res) => {
  res.status(500).json({ error: 'Server error', detail: err?.message || 'Unknown error' })
})

app.listen(PORT, () => {
  console.log(`UEL Survival API running on http://localhost:${PORT}`)
})
