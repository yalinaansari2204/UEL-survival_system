import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion'
import {
  AlarmClock,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Calendar,
  CalendarRange,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleAlert,
  FileText,
  Flame,
  Gauge,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  ListTodo,
  LogOut,
  Moon,
  Play,
  Shield,
  Sparkles,
  Sun,
  Target,
  Trash2,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, clearToken, fetchWeekMaterialPdf, getToken, setToken, uploadWeekMaterialPdf } from './api'
import './App.css'

const basePages = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'assistant', label: 'Study helper', icon: BrainCircuit },
  { id: 'modules', label: 'Modules', icon: BookOpen },
  { id: 'moduleWorkspace', label: 'Module Workspace', icon: BookOpen },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'deadlines', label: 'Deadlines', icon: AlarmClock },
  { id: 'insights', label: 'Insights', icon: ChartNoAxesCombined },
]

/** Matches built-in admin seeded in `server/db.js` (local / demo). */
const DEMO_ADMIN_EMAIL = 'admin@uel.local'
const DEMO_ADMIN_PASSWORD = 'admin123'

const LANDING_USP_PILLARS = [
  {
    Icon: Target,
    title: 'Do this next — not “read a chart”',
    body: 'Every visit opens with a fresh smart pick, your live task list, and real deadlines in one glance. The UI nudges you into motion, not analysis paralysis.',
  },
  {
    Icon: LayoutGrid,
    title: 'One canvas for modules, files, and rhythm',
    body: 'Term cards, week-by-week PDFs, notes, focus blocks, and insights share the same spine — fewer browser tabs, less context switching, more finished work.',
  },
  {
    Icon: Sparkles,
    title: 'Summaries that sound human',
    body: 'PDFs become short, structured briefs: plain language, jargon defined once, and headings you can skim at midnight before a deadline.',
  },
]

const LANDING_CAPABILITIES = [
  {
    Icon: Gauge,
    title: 'Survival dashboard',
    text: 'Status, streaks, quick stats, and “heads up” cues — designed so anxiety has somewhere to land, then a button to act.',
  },
  {
    Icon: BrainCircuit,
    title: 'Study helper',
    text: 'Cockpit layout: smart pick, tasks, deadlines, and deep links in one scroll — no brochureware, just the next three decisions.',
  },
  {
    Icon: BookOpen,
    title: 'Modules & workspace',
    text: 'Per-module home bases with weekly materials, notes, and summaries anchored to the week you are actually in.',
  },
  {
    Icon: AlarmClock,
    title: 'Deadlines with teeth',
    text: 'Assessments sorted by real due dates and context so you can negotiate life around what is immovable.',
  },
  {
    Icon: ListTodo,
    title: 'Tasks that stay honest',
    text: 'Priorities, due dates, and module tags sync into the helper — one list, zero duplicate fiction.',
  },
  {
    Icon: ChartNoAxesCombined,
    title: 'Insights & focus',
    text: 'Charts for where time went, plus an in-app focus timer so effort is logged, not romanticized.',
  },
]

const LANDING_HOW_STEPS = [
  {
    step: '1',
    title: 'Claim your space',
    text: 'Sign in or register with email. Evaluators: use the demo admin hint on the login card for a seeded walkthrough.',
  },
  {
    step: '2',
    title: 'Mirror your term',
    text: 'Open modules by term, drop PDFs into the weekly rail, and capture the tasks that are genuinely on your mind.',
  },
  {
    step: '3',
    title: 'Run tight loops',
    text: 'Refresh the smart pick, tick something small, skim a summary, hit focus — repeat until the week feels legible again.',
  },
]

const emptyData = {
  dashboard: {
    overallStatus: { label: 'Loading', tone: 'yellow' },
    topPriorityTask: { task: 'Loading task...', estimate: '-', priority: '-', rationale: '' },
    upcomingDeadlines: [],
    weeklyProgress: { week: 0, percent: 0 },
    alerts: [],
    quickStats: [],
    studyStreak: { days: 0, message: '' },
    focusBlock: { title: '', window: '', detail: '' },
    modulePulse: [],
    campusReminders: [],
  },
  modules: [],
  deadlines: [],
  assistant: {
    recommendation: null,
    weeklyGuide: [],
    studyTips: [],
    deepDives: [],
    campusNotes: [],
  },
  insights: {
    studyTime: [],
    completionRate: 0,
    modulePerformance: [],
    summary: '',
    riskIndicator: { label: 'Loading', tone: 'yellow' },
    predictivePerformance: 'Average',
  },
}

/** Rotates in the sidebar every minute while you are signed in. */
const SIDEBAR_MOTIVATION_LINES = [
  'Small steps today beat a perfect plan you never start.',
  'Progress, not perfection — one focused block still moves the needle.',
  'Confusion is part of learning; come back to the same page tomorrow.',
  'You do not have to feel ready; you only have to open the brief.',
  'Done is better than perfect for a first draft.',
  'Rest is not the opposite of work — it is what makes work sustainable.',
  'One clear hour beats six half-distracted ones.',
  'Your future self will thank you for the paragraph you write tonight.',
  'Comparison is noisy; your timetable is yours alone.',
  'Ask one question in class or on the forum — it unlocks more than you think.',
  'Revision is not re-reading; it is retrieving — quiz yourself, even briefly.',
  'The best time to email your tutor was last week; the second best is now.',
  'Turn notifications off for 25 minutes. The world can wait.',
  'You belong in the room — impostor feelings lie.',
  'A messy mind is normal; a bullet list is your friend.',
  'Consistency beats intensity when deadlines are months away.',
  'Celebrate turning something in — submission is a skill too.',
  'Walk for five minutes between sessions; your brain consolidates on the move.',
  'If it feels huge, shrink the next step until it feels silly-small.',
  'You are allowed to change study spot when the wall stares back.',
  'Courage is not the absence of stress; it is showing up anyway.',
  'Ship the skeleton version; you can dress it up after feedback.',
  'Sleep is not laziness — it is part of the coursework.',
  'Teach the idea aloud to your phone voice memo — gaps show up fast.',
  'Breathe before you open marks; you are more than one number.',
  'Keep water nearby; hydration is the cheapest cognitive enhancer.',
  'Label files with module codes — future you is already grateful.',
  'You have survived hard weeks before; this one can bend too.',
  'Close ten tabs. One source, one task, one win.',
  'End the session by writing the first line for next time — momentum loves a handle.',
]

const formatTime = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}:${secs}`
}

const formatAssignmentDueLine = (item) => {
  const label =
    item.dueDateLabel ||
    (item.dueDate
      ? new Date(item.dueDate).toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '')
  const days =
    item.dueInDays != null ? `${item.dueInDays} day${item.dueInDays === 1 ? '' : 's'} left` : ''
  if (label && days) return `${label} · ${days}`
  return label || days || ''
}

/** Split server summary into blocks (sections are separated by blank lines in the prompt). */
const splitSummaryForStudents = (raw) => {
  const text = String(raw || '').trim()
  if (!text) return []
  return text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
}

const bulletLineRe = /^[-*•]\s|^\d{1,2}[.)]\s/

const renderSummaryBlock = (block) => {
  const lines = block.split('\n').map((l) => l.trim())
  const firstBullet = lines.findIndex((l) => bulletLineRe.test(l))
  if (firstBullet === -1) {
    return <p className="summary-paragraph">{block}</p>
  }
  const head = lines.slice(0, firstBullet).filter(Boolean).join('\n')
  const bullets = lines.slice(firstBullet).filter((l) => bulletLineRe.test(l))
  if (bullets.length === 0) {
    return <p className="summary-paragraph">{block}</p>
  }
  return (
    <div className="summary-block-stack">
      {head ? <p className="summary-block-lead">{head}</p> : null}
      <ul className="summary-bullet-list">
        {bullets.map((l, i) => (
          <li key={i}>{l.replace(/^[-*•]\s|^\d{1,2}[.)]\s/, '').trim()}</li>
        ))}
      </ul>
    </div>
  )
}

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [data, setData] = useState(emptyData)
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [recommendation, setRecommendation] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFocusActive, setIsFocusActive] = useState(false)
  const [focusSeconds, setFocusSeconds] = useState(0)
  const [focusModule, setFocusModule] = useState('')
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [showLanding, setShowLanding] = useState(true)
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'student' })
  const [adminModules, setAdminModules] = useState([])
  const [adminStudents, setAdminStudents] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [moodleConfig, setMoodleConfig] = useState({ baseUrl: '', token: '', enabled: false })
  const [moodleStatus, setMoodleStatus] = useState('')
  const [moodleCreds, setMoodleCreds] = useState({ username: '', password: '', service: 'moodle_mobile_app' })
  const [moodleDiagnostics, setMoodleDiagnostics] = useState([])
  const [theme, setTheme] = useState('light')
  const [motivationIndex, setMotivationIndex] = useState(
    () => Math.floor(Math.random() * SIDEBAR_MOTIVATION_LINES.length),
  )
  const [notes, setNotes] = useState({})
  const [activeWeek, setActiveWeek] = useState(1)
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState({ title: '', dueDate: '', priority: 'Medium', moduleId: '', week: '' })
  const [weekMaterials, setWeekMaterials] = useState([])
  const [selectedPdfId, setSelectedPdfId] = useState('')
  const [pdfObjectUrl, setPdfObjectUrl] = useState('')
  const [lectureSummaries, setLectureSummaries] = useState({})
  const [summarizing, setSummarizing] = useState(false)
  const weekPdfInputRef = useRef(null)
  const [csvText, setCsvText] = useState('')
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    studentId: '',
    course: 'Computing',
    level: 6,
    intake: '2025/6',
    status: 'Active',
  })
  const [newModule, setNewModule] = useState({
    academicYear: '2025/6',
    code: '',
    title: '',
    level: 6,
    term: 1,
    grade: '',
    status: 'In Progress',
    assessmentsText: '',
  })

  const reduceMotion = useReducedMotion()

  const syncFocus = async () => {
    try {
      const session = await api.get('/api/focus-session')
      setIsFocusActive(session.active)
      setFocusSeconds(session.elapsedSeconds)
      if (session.moduleId) setFocusModule(session.moduleId)
    } catch {
      // background sync noop
    }
  }

  const loadData = useCallback(async () => {
    if (!getToken()) return
    setIsLoading(true)
    setError('')
    try {
      const [profile, payload] = await Promise.all([api.get('/api/me'), api.get('/api/data')])
      setUser(profile.user)
      setData(payload)
      setRecommendation(payload.assistant.recommendation)
      const preferredModule = profile.preferences?.selectedModule
      const preferredTheme = profile.preferences?.theme || 'light'
      const fallback = payload.modules[0]?.id || ''
      setSelectedModuleId(preferredModule || fallback)
      setFocusModule(preferredModule || fallback)
      setTheme(preferredTheme)
      document.documentElement.dataset.theme = preferredTheme
      const [savedNotes, savedTasks] = await Promise.all([api.get('/api/notes'), api.get('/api/tasks')])
      const noteMap = {}
      for (const n of savedNotes) noteMap[`${n.moduleId}:${n.week}`] = n.content
      setNotes(noteMap)
      setTasks(savedTasks)
      if (profile.user.role === 'admin') {
        const [modules, students, logs] = await Promise.all([
          api.get('/api/admin/modules'),
          api.get('/api/admin/students'),
          api.get('/api/admin/audit-logs'),
        ])
        const moodle = await api.get('/api/admin/moodle/config')
        setAdminModules(modules)
        setAdminStudents(students)
        setAuditLogs(logs)
        setMoodleConfig((prev) => ({ ...prev, ...moodle, token: '' }))
      }
    } catch (err) {
      setError(err.message || 'Unable to load app data')
      clearToken()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!user) return undefined
    syncFocus()
    const interval = setInterval(syncFocus, 1000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    if (!user) return undefined
    const id = window.setInterval(() => {
      setMotivationIndex((prev) => {
        const len = SIDEBAR_MOTIVATION_LINES.length
        if (len <= 1) return 0
        let next = prev
        while (next === prev) {
          next = Math.floor(Math.random() * len)
        }
        return next
      })
    }, 60_000)
    return () => clearInterval(id)
  }, [user])

  const modulesByTerm = useMemo(() => {
    const list = data.modules || []
    const map = new Map()
    for (const m of list) {
      const t = m.term ?? 1
      if (!map.has(t)) map.set(t, [])
      map.get(t).push(m)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [data.modules])

  const deadlinesByTerm = useMemo(() => {
    const list = data.deadlines || []
    const map = new Map()
    for (const d of list) {
      const t = d.term ?? 1
      if (!map.has(t)) {
        map.set(t, { term: t, termLabel: d.termLabel || `Term ${t}`, items: [] })
      }
      map.get(t).items.push(d)
    }
    for (const g of map.values()) {
      g.items.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
    }
    return [...map.values()].sort((a, b) => a.term - b.term)
  }, [data.deadlines])

  const openTasksSorted = useMemo(() => {
    const list = (tasks || []).filter((t) => !t.completed)
    const priOrder = { High: 0, Medium: 1, Low: 2 }
    return [...list].sort((a, b) => {
      const da = a.dueDate || '9999-12-31'
      const db = b.dueDate || '9999-12-31'
      if (da !== db) return da.localeCompare(db)
      return (priOrder[a.priority] ?? 1) - (priOrder[b.priority] ?? 1)
    })
  }, [tasks])

  const assistantDeadlinePreview = useMemo(() => (data.deadlines || []).slice(0, 8), [data.deadlines])

  const selectedModule = data.modules.find((module) => module.id === selectedModuleId) || data.modules[0]
  const overallStatus = data.dashboard.overallStatus
  const topPriority = data.dashboard.topPriorityTask

  const handleAuth = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const payload =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : {
              name: authForm.name,
              email: authForm.email,
              password: authForm.password,
              university: 'UEL',
              role: authForm.role,
            }
      const result = await api.post(endpoint, payload)
      setToken(result.token)
      setAuthForm({ name: '', email: '', password: '', role: 'student' })
      await loadData()
    } catch (err) {
      setError(err.message || 'Authentication failed')
    }
  }

  const logout = () => {
    clearToken()
    setUser(null)
    setData(emptyData)
    setRecommendation(null)
    setAdminModules([])
    setAdminStudents([])
    setAuditLogs([])
    setNotes({})
    setTasks([])
    setShowLanding(true)
  }

  const refreshRecommendation = async () => {
    try {
      setRecommendation(await api.post('/api/assistant/recommendation'))
    } catch (err) {
      setError(err.message || 'Could not generate recommendation')
    }
  }

  const toggleFocusSession = async () => {
    const endpoint = isFocusActive ? '/api/focus-session/pause' : '/api/focus-session/start'
    const body = isFocusActive ? {} : { moduleId: focusModule }
    try {
      const session = await api.post(endpoint, body)
      setIsFocusActive(session.active)
      setFocusSeconds(session.elapsedSeconds)
    } catch (err) {
      setError(err.message || 'Failed to update focus session')
    }
  }

  const resetFocusSession = async () => {
    try {
      const session = await api.post('/api/focus-session/reset')
      setIsFocusActive(session.active)
      setFocusSeconds(session.elapsedSeconds)
    } catch (err) {
      setError(err.message || 'Failed to reset focus session')
    }
  }

  const updatePreference = async (moduleId) => {
    setSelectedModuleId(moduleId)
    setFocusModule(moduleId)
    try {
      await api.put('/api/preferences', { selectedModule: moduleId })
    } catch {
      // non-critical
    }
  }

  const toggleTheme = async () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.dataset.theme = next
    try {
      await api.put('/api/preferences', { theme: next })
    } catch {
      // non-critical
    }
  }

  const noteKey = `${selectedModuleId}:${activeWeek}`
  const saveNote = async (content) => {
    setNotes((prev) => ({ ...prev, [noteKey]: content }))
    try {
      await api.put('/api/notes', { moduleId: selectedModuleId, week: activeWeek, content })
    } catch (err) {
      setError(err.message || 'Failed to save note')
    }
  }

  const refreshWeekMaterials = useCallback(async () => {
    if (!getToken() || !selectedModuleId) return
    try {
      const list = await api.get(
        `/api/week-materials?moduleId=${encodeURIComponent(selectedModuleId)}&week=${encodeURIComponent(activeWeek)}`,
      )
      setWeekMaterials(list)
    } catch {
      setWeekMaterials([])
    }
  }, [selectedModuleId, activeWeek])

  useEffect(() => {
    refreshWeekMaterials()
  }, [refreshWeekMaterials])

  useEffect(() => {
    if (weekMaterials.length === 0) {
      setSelectedPdfId('')
      return
    }
    if (!weekMaterials.find((m) => m.id === selectedPdfId)) {
      setSelectedPdfId(weekMaterials[0].id)
    }
  }, [weekMaterials, selectedPdfId])

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    const run = async () => {
      if (!selectedPdfId) {
        setPdfObjectUrl('')
        return
      }
      try {
        const blob = await fetchWeekMaterialPdf(selectedPdfId)
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setPdfObjectUrl(objectUrl)
      } catch {
        if (!cancelled) setPdfObjectUrl('')
      }
    }
    run()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [selectedPdfId])

  const addNewTask = async () => {
    if (!newTask.title.trim()) return
    try {
      const created = await api.post('/api/tasks', {
        title: newTask.title,
        dueDate: newTask.dueDate || null,
        priority: newTask.priority,
        moduleId: newTask.moduleId || selectedModuleId || null,
        week: newTask.week || null,
      })
      setTasks((prev) => [created, ...prev])
      setNewTask({ title: '', dueDate: '', priority: 'Medium', moduleId: '', week: '' })
    } catch (err) {
      setError(err.message || 'Failed to create task')
    }
  }

  const updateTaskItem = async (id, patch) => {
    try {
      const updated = await api.put(`/api/tasks/${id}`, patch)
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    } catch (err) {
      setError(err.message || 'Failed to update task')
    }
  }

  const deleteTaskItem = async (id) => {
    try {
      await api.request(`/api/tasks/${id}`, { method: 'DELETE' })
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setError(err.message || 'Failed to delete task')
    }
  }

  const attachSamplePdf = async () => {
    try {
      await api.post('/api/week-materials/attach-sample', { moduleId: selectedModuleId, week: activeWeek })
      await refreshWeekMaterials()
    } catch (err) {
      setError(err.message || 'Could not attach sample PDF')
    }
  }

  const uploadPdfForWeek = async (file) => {
    if (!file) return
    try {
      await uploadWeekMaterialPdf(selectedModuleId, activeWeek, file)
      await refreshWeekMaterials()
    } catch (err) {
      setError(err.message || 'Upload failed')
    }
  }

  const removeWeekMaterial = async (id) => {
    try {
      await api.request(`/api/week-materials/${id}`, { method: 'DELETE' })
      await refreshWeekMaterials()
    } catch (err) {
      setError(err.message || 'Delete failed')
    }
  }

  const summarizeSelectedPdf = async () => {
    if (!selectedPdfId) return
    setSummarizing(true)
    try {
      const result = await api.post(`/api/week-materials/${selectedPdfId}/summarize`)
      setLectureSummaries((prev) => ({
        ...prev,
        [noteKey]: { text: result.summary, source: result.source },
      }))
    } catch (err) {
      setError(err.message || 'Summarization failed')
    } finally {
      setSummarizing(false)
    }
  }

  const appendSummaryToNotes = async () => {
    const block = lectureSummaries[noteKey]
    if (!block) return
    const cur = notes[noteKey] || ''
    const merged = `${cur.trim()}\n\n--- Lecture summary (${block.source}) ---\n${block.text}`.trim()
    await saveNote(merged)
  }

  const refreshAdminModules = async () => {
    if (user?.role !== 'admin') return
    const [modules, students, logs] = await Promise.all([
      api.get('/api/admin/modules'),
      api.get('/api/admin/students'),
      api.get('/api/admin/audit-logs'),
    ])
    const moodle = await api.get('/api/admin/moodle/config')
    setAdminModules(modules)
    setAdminStudents(students)
    setAuditLogs(logs)
    setMoodleConfig((prev) => ({ ...prev, ...moodle, token: '' }))
  }

  const createModule = async () => {
    const payload = {
      ...newModule,
      level: Number(newModule.level),
      term: Number(newModule.term),
      grade: newModule.grade === '' ? null : Number(newModule.grade),
      assessments: newModule.assessmentsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    await api.post('/api/admin/modules', payload)
    setNewModule({
      academicYear: '2025/6',
      code: '',
      title: '',
      level: 6,
      term: 1,
      grade: '',
      status: 'In Progress',
      assessmentsText: '',
    })
    await refreshAdminModules()
    await loadData()
  }

  const updateAdminModule = async (id, patch) => {
    await api.put(`/api/admin/modules/${id}`, patch)
    await refreshAdminModules()
    await loadData()
  }

  const removeAdminModule = async (id) => {
    await api.request('/api/admin/modules/' + id, { method: 'DELETE' })
    await refreshAdminModules()
    await loadData()
  }

  const importModulesCsv = async () => {
    await api.post('/api/admin/modules/import-csv', { csv: csvText })
    setCsvText('')
    await refreshAdminModules()
    await loadData()
  }

  const createStudent = async () => {
    await api.post('/api/admin/students', { ...newStudent, level: Number(newStudent.level) })
    setNewStudent({ name: '', email: '', studentId: '', course: 'Computing', level: 6, intake: '2025/6', status: 'Active' })
    await refreshAdminModules()
  }

  const updateAdminStudent = async (id, patch) => {
    await api.put(`/api/admin/students/${id}`, patch)
    await refreshAdminModules()
  }

  const removeAdminStudent = async (id) => {
    await api.request('/api/admin/students/' + id, { method: 'DELETE' })
    await refreshAdminModules()
  }

  const saveMoodleConnector = async () => {
    await api.put('/api/admin/moodle/config', moodleConfig)
    setMoodleStatus('Moodle configuration saved.')
    await refreshAdminModules()
  }

  const testMoodleConnector = async () => {
    try {
      const result = await api.post('/api/admin/moodle/test')
      setMoodleStatus(`Connected: ${result.info.siteName} as ${result.info.userName}`)
    } catch (err) {
      setMoodleStatus(`Connection failed: ${err.message}`)
    }
  }

  const importMoodleCourses = async () => {
    try {
      const result = await api.post('/api/admin/moodle/import-courses')
      setMoodleStatus(`Imported ${result.imported} Moodle courses.`)
      await refreshAdminModules()
      await loadData()
    } catch (err) {
      setMoodleStatus(`Import failed: ${err.message}`)
    }
  }

  const generateMoodleTokenFromCredentials = async () => {
    try {
      await api.post('/api/admin/moodle/generate-token', {
        baseUrl: moodleConfig.baseUrl,
        username: moodleCreds.username,
        password: moodleCreds.password,
        service: moodleCreds.service,
      })
      setMoodleStatus('Token generated successfully from Moodle credentials.')
      setMoodleCreds((p) => ({ ...p, password: '' }))
      await refreshAdminModules()
    } catch (err) {
      setMoodleStatus(`Token generation failed: ${err.message}`)
    }
  }

  const runMoodleDiagnostics = async () => {
    try {
      const result = await api.post('/api/admin/moodle/diagnose')
      setMoodleDiagnostics(result.checks || [])
      setMoodleStatus(result.ok ? 'Diagnostics passed.' : 'Diagnostics found issues. See checks below.')
    } catch (err) {
      setMoodleStatus(`Diagnostics failed: ${err.message}`)
    }
  }

  if (!user && showLanding) {
    const goAuth = (mode) => {
      setError('')
      setAuthMode(mode)
      setShowLanding(false)
    }

    return (
      <Motion.main
        className="landing-shell"
        initial={reduceMotion === true ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion === true ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="landing-page">
          <header className="landing-nav">
            <div className="landing-nav-brand" aria-hidden>
              <span className="landing-nav-mark">UEL</span>
              <span className="landing-nav-name">Survival System</span>
            </div>
            <div className="landing-nav-actions">
              <button type="button" className="landing-btn landing-btn--ghost landing-nav-btn" onClick={() => goAuth('login')}>
                Sign in
              </button>
              <button
                type="button"
                className="landing-btn landing-btn--primary landing-nav-btn landing-nav-btn--primary"
                onClick={() => goAuth('register')}
              >
                Create account
              </button>
            </div>
          </header>

          <section className="landing-hero" aria-labelledby="landing-hero-title">
            <div className="landing-hero-grid">
              <div className="landing-hero-copy">
                <p className="landing-kicker">University of East London · Student workload companion</p>
                <h1 id="landing-hero-title" className="landing-hero-title">
                  Survive the term with clarity, not chaos
                </h1>
                <p className="landing-hero-lead">
                  Deadlines, PDFs, tasks, and focus time roll into one calm loop — so you always know the next small win,
                  and programme teams can keep the catalogue aligned without another bespoke report.
                </p>
                <ul className="landing-hero-bullets">
                  <li>
                    <CheckCircle2 size={18} aria-hidden />
                    <span>Respects real life: lectures, shifts, caring, and the gaps between them.</span>
                  </li>
                  <li>
                    <CheckCircle2 size={18} aria-hidden />
                    <span>One screen answers “what now?” with picks, tasks, and due context together.</span>
                  </li>
                  <li>
                    <CheckCircle2 size={18} aria-hidden />
                    <span>Demo-ready today; shaped for Moodle-style data when you wire production.</span>
                  </li>
                </ul>
                <div className="landing-hero-cta">
                  <button
                    type="button"
                    className="landing-btn landing-btn--primary landing-hero-cta-main"
                    onClick={() => goAuth('login')}
                  >
                    Sign in to your workspace
                    <ArrowRight size={18} aria-hidden />
                  </button>
                  <button type="button" className="landing-btn landing-btn--ghost landing-hero-cta-sub" onClick={() => goAuth('register')}>
                    New here? Create a free account
                  </button>
                </div>
              </div>
              <div className="landing-hero-visual" aria-hidden>
                <div className="landing-mock-stack">
                  <div className="landing-mock-card landing-mock-card--1">
                    <span className="landing-mock-label">Smart pick</span>
                    <div className="landing-mock-line">Revise cohort study guide · ~25 min</div>
                  </div>
                  <div className="landing-mock-card landing-mock-card--2">
                    <span className="landing-mock-label">This week</span>
                    <div className="landing-mock-line">3 tasks · 2 PDFs · Module workspace open</div>
                  </div>
                  <div className="landing-mock-card landing-mock-card--3">
                    <span className="landing-mock-label">Focus</span>
                    <div className="landing-mock-line">Session logged · Streak building</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="landing-section landing-usp" aria-labelledby="landing-usp-title">
            <div className="landing-section-head">
              <p className="landing-kicker landing-kicker--dim">Philosophy</p>
              <h2 id="landing-usp-title" className="landing-section-title">
                Built like a studio, not a spreadsheet
              </h2>
              <p className="landing-section-intro">
                Most tools either drown you in metrics or orphan your files. Here, <strong>intent</strong> (what to do),
                <strong> context</strong> (modules, weeks, PDFs), and <strong>comprehension</strong> (human summaries) share
                one spine — so the product feels authored, not assembled.
              </p>
            </div>
            <div className="landing-usp-grid">
              {LANDING_USP_PILLARS.map((pillar) => {
                const PillarIcon = pillar.Icon
                return (
                  <article key={pillar.title} className="landing-usp-card">
                    <div className="landing-usp-icon-wrap">
                      <PillarIcon size={22} strokeWidth={1.75} aria-hidden />
                    </div>
                    <h3 className="landing-usp-card-title">{pillar.title}</h3>
                    <p className="landing-usp-card-text">{pillar.body}</p>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="landing-section landing-cap" aria-labelledby="landing-cap-title">
            <div className="landing-section-head">
              <p className="landing-kicker landing-kicker--dim">Surface area</p>
              <h2 id="landing-cap-title" className="landing-section-title">
                One survival loop, many doors in
              </h2>
              <p className="landing-section-intro">
                Dashboard, helper, modules, tasks, deadlines, and insights all read the same records — polish in the UI,
                discipline in the data model.
              </p>
            </div>
            <div className="landing-cap-grid">
              {LANDING_CAPABILITIES.map((cap) => {
                const CapIcon = cap.Icon
                return (
                  <article key={cap.title} className="landing-cap-card">
                    <CapIcon className="landing-cap-icon" size={20} strokeWidth={1.75} aria-hidden />
                    <h3 className="landing-cap-card-title">{cap.title}</h3>
                    <p className="landing-cap-card-text">{cap.text}</p>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="landing-section landing-how" aria-labelledby="landing-how-title">
            <div className="landing-section-head">
              <p className="landing-kicker landing-kicker--dim">Flow</p>
              <h2 id="landing-how-title" className="landing-section-title">
                Three moves, then repeat
              </h2>
            </div>
            <ol className="landing-how-list">
              {LANDING_HOW_STEPS.map(({ step, title, text }) => (
                <li key={step} className="landing-how-item">
                  <span className="landing-how-step" aria-hidden>
                    {step}
                  </span>
                  <div>
                    <h3 className="landing-how-item-title">{title}</h3>
                    <p className="landing-how-item-text">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="landing-admin-band" aria-labelledby="landing-admin-title">
            <Shield className="landing-admin-icon" size={28} aria-hidden />
            <div>
              <h2 id="landing-admin-title" className="landing-admin-title">
                For programme teams as well as students
              </h2>
              <p className="landing-admin-text">
                Admin mode corrals modules, student records, audit trails, and Moodle connector settings — so programme
                teams can align what learners see with catalogue truth without commissioning another one-off report every
                Monday.
              </p>
            </div>
          </section>

          <section className="landing-footer-cta" aria-label="Get started">
            <FileText size={22} className="landing-footer-icon" aria-hidden />
            <div className="landing-footer-copy">
              <h2 className="landing-footer-title">Ready to try your survival loop?</h2>
              <p className="landing-footer-lead">
                Sign in to load your dashboard, or register a new student account. The login screen includes a demo admin
                account for local evaluation only.
              </p>
            </div>
            <div className="landing-footer-actions">
              <button type="button" className="landing-btn landing-btn--primary" onClick={() => goAuth('login')}>
                Sign in
                <ArrowRight size={18} aria-hidden />
              </button>
              <button type="button" className="landing-btn landing-btn--ghost" onClick={() => goAuth('register')}>
                Create account
              </button>
            </div>
          </section>

          <p className="landing-footnote">
            UEL Survival System is a demonstration project: connect your real Moodle and timetables when you deploy it for
            production, and always treat official university systems as the source of truth for marks and deadlines.
          </p>
        </div>
      </Motion.main>
    )
  }

  if (!user) {
    return (
      <Motion.main
        className="auth-shell"
        initial={reduceMotion === true ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion === true ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Motion.section
          className="auth-card"
          initial={reduceMotion === true ? false : { opacity: 0, y: 22, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={
            reduceMotion === true
              ? { duration: 0 }
              : { type: 'spring', stiffness: 320, damping: 28, delay: 0.06 }
          }
        >
          <button type="button" className="link-btn landing-back-link" onClick={() => setShowLanding(true)}>
            ← About this app
          </button>
          <h1>UEL Survival System</h1>
          <p>Sign in to continue your personalized study dashboard.</p>
          {authMode === 'login' && (
            <div className="auth-demo-hint" role="note">
              <strong>Demo admin login</strong>
              <span>
                <code>{DEMO_ADMIN_EMAIL}</code> · password <code>{DEMO_ADMIN_PASSWORD}</code>
              </span>
              <small>Seeded automatically for local use — change it in production.</small>
            </div>
          )}
          {error && <div className="error-banner">{error}</div>}
          <form className="auth-form" onSubmit={handleAuth}>
            {authMode === 'register' && (
              <>
                <input placeholder="Full name" value={authForm.name} onChange={(e) => setAuthForm((prev) => ({ ...prev, name: e.target.value }))} required />
                <select value={authForm.role} onChange={(e) => setAuthForm((prev) => ({ ...prev, role: e.target.value }))}>
                  <option value="student">Student account</option>
                  <option value="admin">Admin account</option>
                </select>
              </>
            )}
            <input placeholder="Email" type="email" value={authForm.email} onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))} required />
            <input placeholder="Password" type="password" value={authForm.password} onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))} required />
            <Motion.button
              className="primary-btn"
              type="submit"
              whileHover={reduceMotion === true ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion === true ? undefined : { scale: 0.98 }}
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </Motion.button>
          </form>
          <Motion.button
            className="ghost-btn"
            type="button"
            onClick={() => setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'))}
            whileTap={reduceMotion === true ? undefined : { scale: 0.98 }}
          >
            {authMode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
          </Motion.button>
        </Motion.section>
      </Motion.main>
    )
  }

  const renderDashboard = () => (
    <div className="page-grid dashboard-grid">
      <section className="card hero-card dash-hero">
        <p className="eyebrow">UEL Survival System</p>
        <h1>Welcome back, {user.name}</h1>
        <p>Your academic control center for smart planning, focus, and consistent progress.</p>
        <div className="dash-hero-meta">
          <span className="dash-pill">Synthetic dataset</span>
          <span className="dash-pill dash-pill--muted">Refreshes with “Refresh Synthetic Dataset”</span>
        </div>
      </section>
      <section className={`card status-card dash-status ${overallStatus.tone}`}>
        <div className="card-title-row">
          <h3>Overall Status</h3>
          <Gauge size={18} />
        </div>
        <strong>{overallStatus.label}</strong>
        <p>{data.dashboard.alerts[0] || 'Strong pace this week.'}</p>
      </section>
      <section className="card highlight dash-priority">
        <div className="card-title-row">
          <h3>Top Priority Task</h3>
          <Sparkles size={18} />
        </div>
        <strong>{topPriority.task}</strong>
        <p>{topPriority.estimate} • Priority {topPriority.priority}</p>
      </section>

      <section className="card dash-stats">
        <div className="card-title-row">
          <h3>At a glance</h3>
          <LayoutGrid size={18} />
        </div>
        <div className="dash-stat-grid">
          {(data.dashboard.quickStats || []).map((s) => (
            <div key={s.label} className="dash-stat-tile">
              <span className="dash-stat-label">{s.label}</span>
              <strong className="dash-stat-value">{s.value}</strong>
              <span className="dash-stat-hint">{s.hint}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card dash-streak">
        <div className="card-title-row">
          <h3>Study streak</h3>
          <Flame size={18} />
        </div>
        <p className="dash-streak-days">
          <strong>{data.dashboard.studyStreak?.days ?? 0}</strong> day streak
        </p>
        <p className="dash-streak-msg">{data.dashboard.studyStreak?.message}</p>
      </section>

      <section className="card dash-focus">
        <div className="card-title-row">
          <h3>{data.dashboard.focusBlock?.title || 'Focus block'}</h3>
          <CalendarRange size={18} />
        </div>
        <p className="dash-focus-window">{data.dashboard.focusBlock?.window}</p>
        <p>{data.dashboard.focusBlock?.detail}</p>
      </section>

      <section className="card dash-modules">
        <div className="card-title-row">
          <h3>Module pulse</h3>
          <Target size={18} />
        </div>
        <ul className="dash-pulse-list">
          {(data.dashboard.modulePulse || []).map((m) => (
            <li key={m.id}>
              <div>
                <span className="dash-pulse-name">{m.name}</span>
                <span className="dash-pulse-sub">
                  <span className="dash-pulse-term">{m.termLabel || `Term ${m.term ?? 1}`}</span>
                  {m.hours != null ? ` · ${m.hours}h / week (est.)` : ''}
                </span>
              </div>
              <div className="dash-pulse-bar-wrap">
                <div className="progress-track dash-pulse-track">
                  <div className="progress-fill" style={{ width: `${m.progress}%` }} />
                </div>
                <span className="dash-pulse-pct">{m.progress}%</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card dash-deadlines">
        <div className="card-title-row">
          <h3>Upcoming Deadlines</h3>
          <AlarmClock size={18} />
        </div>
        <ul className="clean-list dash-deadline-list">
          {data.dashboard.upcomingDeadlines.map((item) => (
            <li key={item.id}>
              <span className="dash-deadline-title">{item.name}</span>
              <small className="dash-deadline-meta">
                {item.moduleName}
                {item.moduleName ? ' · ' : ''}
                {formatAssignmentDueLine(item)}
              </small>
            </li>
          ))}
        </ul>
      </section>
      <section className="card dash-weekly">
        <div className="card-title-row">
          <h3>Weekly Progress</h3>
          <Calendar size={18} />
        </div>
        <p className="week-label">Week {data.dashboard.weeklyProgress.week} of term</p>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${data.dashboard.weeklyProgress.percent}%` }} />
        </div>
      </section>
      <section className="card alerts dash-alerts">
        <div className="card-title-row">
          <h3>Alert System</h3>
          <CircleAlert size={18} />
        </div>
        <ul className="clean-list">{data.dashboard.alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul>
      </section>

      <section className="card dash-tips">
        <div className="card-title-row">
          <h3>UEL survival tips</h3>
          <Lightbulb size={18} />
        </div>
        <ul className="dash-tip-list">
          {(data.dashboard.campusReminders || []).map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>
    </div>
  )

  const renderAssistant = () => {
    const goWorkspaceForModule = (moduleId) => {
      if (!moduleId) return
      updatePreference(moduleId)
      setActivePage('moduleWorkspace')
    }

    return (
      <div className="assistant-page assistant-helper">
        <header className="assistant-page-head">
          <h2 className="assistant-page-title">Smart study helper</h2>
          <p className="assistant-page-lead">
            Act on your real workload here: a fresh &quot;do this next&quot; pick, every open task you can tick off, the next
            deadlines, and a focus timer—without hunting through the rest of the app.
          </p>
        </header>

        <div className="assistant-helper-grid">
          <div className="assistant-helper-main">
            <section className="card assistant-helper-card" aria-labelledby="assistant-smart-pick">
              <div className="assistant-helper-card-head">
                <div>
                  <p className="eyebrow" id="assistant-smart-pick">
                    Do this first
                  </p>
                  <h3 className="assistant-helper-card-title">Smart pick from your modules &amp; deadlines</h3>
                  <p className="assistant-helper-sub">
                    Uses the same logic as your dashboard priority—refresh when you finish something or your week shifts.
                  </p>
                </div>
                <button type="button" className="ghost-btn assistant-helper-refresh" onClick={refreshRecommendation}>
                  <Sparkles size={16} aria-hidden />
                  Refresh pick
                </button>
              </div>

              {recommendation ? (
                <div className="recommendation-panel">
                  <h3 className="recommendation-task">{recommendation.task}</h3>
                  <div className="recommendation-meta">
                    <div className="recommendation-chip">
                      <span className="recommendation-chip-label">Time</span>
                      <span className="recommendation-chip-val">{recommendation.estimate}</span>
                    </div>
                    <div className="recommendation-chip">
                      <span className="recommendation-chip-label">Priority</span>
                      <span className="recommendation-chip-val">{recommendation.priority}</span>
                    </div>
                  </div>
                  <p className="recommendation-rationale">{recommendation.rationale}</p>
                </div>
              ) : (
                <div className="recommendation-placeholder">
                  <p>
                    Loading a pick from your data… If nothing appears, use <strong>Refresh pick</strong> after your modules
                    load.
                  </p>
                </div>
              )}
            </section>

            <section className="card assistant-helper-card" aria-labelledby="assistant-open-tasks">
              <div className="assistant-helper-card-head assistant-helper-card-head--tight">
                <div>
                  <h3 className="assistant-helper-card-title" id="assistant-open-tasks">
                    Your open tasks
                  </h3>
                  <p className="assistant-helper-sub">
                    {openTasksSorted.length} open — tick to complete (same as the Tasks page).
                  </p>
                </div>
                <button type="button" className="ghost-btn" onClick={() => setActivePage('tasks')}>
                  <ListTodo size={16} aria-hidden />
                  Full task list
                </button>
              </div>
              {openTasksSorted.length === 0 ? (
                <div className="assistant-helper-empty">
                  No open tasks. Add quick wins on the{' '}
                  <button type="button" className="link-btn" onClick={() => setActivePage('tasks')}>
                    Tasks
                  </button>{' '}
                  page so they show up here.
                </div>
              ) : (
                <ul className="assistant-helper-tasklist">
                  {openTasksSorted.map((t) => (
                    <li key={t.id} className="assistant-helper-taskrow">
                      <label className="assistant-helper-tasklabel">
                        <input
                          type="checkbox"
                          checked={t.completed}
                          onChange={(e) => updateTaskItem(t.id, { completed: e.target.checked })}
                        />
                        <span className="assistant-helper-tasktitle">{t.title}</span>
                      </label>
                      <div className="assistant-helper-taskmeta">
                        <span className="assistant-helper-taskdue">{t.dueDate ? `Due ${t.dueDate}` : 'No due date'}</span>
                        <span className={`badge ${String(t.priority || 'Medium').toLowerCase()}`}>{t.priority}</span>
                        {t.moduleId ? (
                          <button type="button" className="link-btn" onClick={() => goWorkspaceForModule(t.moduleId)}>
                            Workspace
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card assistant-helper-card" aria-labelledby="assistant-deadlines-preview">
              <div className="assistant-helper-card-head assistant-helper-card-head--tight">
                <div>
                  <h3 className="assistant-helper-card-title" id="assistant-deadlines-preview">
                    Next deadlines
                  </h3>
                  <p className="assistant-helper-sub">Soonest assessments from your module data — jump to plan around them.</p>
                </div>
                <button type="button" className="ghost-btn" onClick={() => setActivePage('deadlines')}>
                  <AlarmClock size={16} aria-hidden />
                  All deadlines
                </button>
              </div>
              {assistantDeadlinePreview.length === 0 ? (
                <p className="assistant-helper-empty">No deadline data yet.</p>
              ) : (
                <ul className="assistant-helper-deadlist">
                  {assistantDeadlinePreview.map((d) => (
                    <li key={d.id} className="assistant-helper-deadrow">
                      <div className="assistant-helper-deadmain">
                        <strong>{d.name}</strong>
                        <span className="assistant-helper-deadmodule">{d.moduleName}</span>
                        <span className="assistant-helper-deaddate">{formatAssignmentDueLine(d)}</span>
                      </div>
                      <div className="assistant-helper-deadactions">
                        <span className={`badge ${d.status?.tone || 'yellow'}`}>{d.status?.label}</span>
                        {d.moduleId ? (
                          <button type="button" className="link-btn" onClick={() => goWorkspaceForModule(d.moduleId)}>
                            Open module
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card assistant-helper-card" aria-label="Weekly rhythm from your data feed">
              <div className="assistant-helper-card-head assistant-helper-card-head--tight">
                <h3 className="assistant-helper-card-title">This week&apos;s rhythm</h3>
                <BookOpen size={18} className="assistant-helper-inline-icon" aria-hidden />
              </div>
              <p className="assistant-helper-sub">Suggested moves that align with your current modules and deadlines.</p>
              <ul className="assistant-guide-list">
                {(data.assistant.weeklyGuide || []).map((task, i) => (
                  <li key={task}>
                    <span className="assistant-guide-step">{i + 1}</span>
                    <span className="assistant-guide-text">{task}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="assistant-helper-rail" aria-label="Focus and shortcuts">
            <section className="card assistant-helper-card assistant-helper-focuscard">
              <h3 className="assistant-helper-card-title">Focus session</h3>
              <p className="assistant-helper-sub">Start a timed block on the module you are working on.</p>
              <label className="label" htmlFor="assistant-focus-module">
                Module
              </label>
              <select
                id="assistant-focus-module"
                className="select-input"
                value={focusModule}
                onChange={(e) => updatePreference(e.target.value)}
              >
                {data.modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.name}
                    {module.termLabel ? ` (${module.termLabel})` : ''}
                  </option>
                ))}
              </select>
              <div className="focus-controls">
                <button type="button" className="primary-btn" onClick={toggleFocusSession}>
                  <Play size={14} aria-hidden />
                  {isFocusActive ? 'Pause' : 'Start'}
                </button>
                <button type="button" className="ghost-btn" onClick={resetFocusSession}>
                  Reset
                </button>
              </div>
              <p className="assistant-helper-timer">
                <span className="assistant-helper-timer-label">Elapsed</span>
                <strong className="focus-time">{formatTime(focusSeconds)}</strong>
              </p>
            </section>

            <nav className="card assistant-helper-card" aria-label="Jump to tools">
              <h3 className="assistant-helper-card-title">Jump to</h3>
              <p className="assistant-helper-sub">Open the page you need in one tap.</p>
              <div className="assistant-helper-jump">
                <button type="button" className="ghost-btn assistant-helper-jumpbtn" onClick={() => setActivePage('tasks')}>
                  <ListTodo size={18} aria-hidden />
                  Tasks
                </button>
                <button type="button" className="ghost-btn assistant-helper-jumpbtn" onClick={() => setActivePage('deadlines')}>
                  <AlarmClock size={18} aria-hidden />
                  Deadlines
                </button>
                <button type="button" className="ghost-btn assistant-helper-jumpbtn" onClick={() => setActivePage('modules')}>
                  <BookOpen size={18} aria-hidden />
                  Modules
                </button>
                <button
                  type="button"
                  className="ghost-btn assistant-helper-jumpbtn"
                  onClick={() => setActivePage('moduleWorkspace')}
                >
                  <Target size={18} aria-hidden />
                  Workspace
                </button>
                <button type="button" className="ghost-btn assistant-helper-jumpbtn" onClick={() => setActivePage('insights')}>
                  <ChartNoAxesCombined size={18} aria-hidden />
                  Insights
                </button>
                <button type="button" className="ghost-btn assistant-helper-jumpbtn" onClick={() => setActivePage('dashboard')}>
                  <LayoutDashboard size={18} aria-hidden />
                  Dashboard
                </button>
              </div>
            </nav>
          </aside>
        </div>

        <details className="assistant-helper-more">
          <summary className="assistant-helper-more-summary">More tips, playbooks &amp; VLE notes (optional reading)</summary>
          <div className="assistant-extra assistant-helper-more-grid">
            <section className="card assistant-extra-card" aria-label="Study tips">
              <div className="assistant-extra-head">
                <h3>Study rhythm tips</h3>
                <Lightbulb size={18} aria-hidden />
              </div>
              <p className="assistant-extra-lead">Micro-habits when you have spare minutes.</p>
              <ul className="assistant-tip-list">
                {(data.assistant.studyTips || []).map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </section>

            <section className="card assistant-extra-card" aria-label="Deep dives">
              <div className="assistant-extra-head">
                <h3>Playbooks</h3>
                <BrainCircuit size={18} aria-hidden />
              </div>
              <p className="assistant-extra-lead">Short strategy reads.</p>
              <div className="assistant-dive-stack">
                {(data.assistant.deepDives || []).map((d) => (
                  <article key={d.title} className="assistant-dive">
                    <h4>{d.title}</h4>
                    <p>{d.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="card assistant-extra-card" aria-label="Campus notes">
              <div className="assistant-extra-head">
                <h3>Campus &amp; VLE notes</h3>
                <BookOpen size={18} aria-hidden />
              </div>
              <p className="assistant-extra-lead">When you connect Moodle and real calendars.</p>
              <ul className="assistant-campus-list">
                {(data.assistant.campusNotes || []).map((n) => (
                  <li key={n.title}>
                    <strong>{n.title}</strong>
                    <span>{n.detail}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </details>
      </div>
    )
  }

  const renderModules = () => (
    <div className="modules-page">
      <header className="modules-page-head">
        <div>
          <h2 className="modules-page-title">Modules</h2>
          <p className="modules-page-lead">
            Modules are grouped by term so you can see what belongs to each block of the academic year. Compare risk and
            progress, then open the workspace for PDFs, notes, and weekly study.
          </p>
        </div>
      </header>

      <div className="modules-page-shell">
        <div className="module-catalog">
          {modulesByTerm.map(([term, mods]) => (
            <section key={term} className="module-term-block" aria-labelledby={`module-term-${term}`}>
              <h3 id={`module-term-${term}`} className="module-term-heading">
                {mods[0]?.termLabel || `Term ${term}`}
                <span className="module-term-count">{mods.length} module{mods.length === 1 ? '' : 's'}</span>
              </h3>
              <div className="module-grid" aria-label={`Module list, term ${term}`}>
                {mods.map((module) => {
                  const risk = module.progress < 40 ? 'High' : module.progress < 65 ? 'Medium' : 'Low'
                  const nextAssignment = [...module.assignments].sort((a, b) => a.dueInDays - b.dueInDays)[0]
                  return (
                    <article
                      key={module.id}
                      className={`card module-card ${selectedModuleId === module.id ? 'active' : ''}`}
                      onClick={() => updatePreference(module.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && updatePreference(module.id)}
                    >
                      <div className="module-card-accent" aria-hidden />
                      <div className="module-card-head">
                        <h3 className="module-card-title">{module.name}</h3>
                        <span className={`badge ${risk.toLowerCase()}`}>{risk} risk</span>
                      </div>
                      <div className="module-card-progress">
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${module.progress}%` }} />
                        </div>
                        <small>{module.progress}% complete</small>
                      </div>
                      <p className="module-card-next">
                        <span className="module-card-next-label">Next up</span>
                        {nextAssignment?.name || 'No assignments'}
                        {nextAssignment ? (
                          <span className="module-card-next-due"> · {formatAssignmentDueLine(nextAssignment)}</span>
                        ) : null}
                      </p>
                      <div className="module-card-actions">
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            updatePreference(module.id)
                            setActivePage('moduleWorkspace')
                          }}
                        >
                          Open workspace
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="card module-inspector" aria-label="Module details">
          {selectedModule ? (
            <div className="module-details">
              <div className="module-inspector-head">
                <h3>{selectedModule.name}</h3>
                <p className="module-inspector-sub">
                  {selectedModule.termLabel || `Term ${selectedModule.term ?? 1}`} — assignments and common pitfalls for
                  this module.
                </p>
              </div>
              <h4 className="module-inspector-section-title">Assignments</h4>
              <ul className="clean-list">
                {selectedModule.assignments.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    <small>
                      {formatAssignmentDueLine(item)} · {item.progress}% done
                    </small>
                  </li>
                ))}
              </ul>
              <h4 className="module-inspector-section-title">Common mistakes</h4>
              <ul className="clean-list">
                {selectedModule.commonMistakes.map((mistake) => (
                  <li key={mistake}>{mistake}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="module-inspector-empty">
              <h3>Select a module</h3>
              <p>Click a card in the catalog to load assignments and tips here.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )

  const renderModuleWorkspace = () => (
    <div className="single-column">
      {selectedModule ? (
        <>
          <section className="card">
            <h3>{selectedModule.name} - Dedicated Module Page</h3>
            <p className="module-workspace-term">
              {selectedModule.termLabel || `Term ${selectedModule.term ?? 1}`}
            </p>
            <p>Track weekly study progression, active assignments, and focused actions for this module.</p>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${selectedModule.progress}%` }} /></div>
            <small>{selectedModule.progress}% module completion</small>
          </section>
          <section className="card">
            <h3>Weekly Study Plan</h3>
            <div className="week-grid">
              {(selectedModule.studyWeeks || []).map((week) => (
                <button
                  key={`${selectedModule.id}-week-${week.week}`}
                  className={`week-pill ${activeWeek === week.week ? 'active' : ''}`}
                  onClick={() => setActiveWeek(week.week)}
                >
                  Week {week.week}
                </button>
              ))}
            </div>
            {(() => {
              const w = (selectedModule.studyWeeks || []).find((x) => x.week === activeWeek)
              if (!w) return null
              return (
                <div className="week-panel">
                  <h4>
                    Week {w.week}: {w.topic}
                  </h4>
                  <p>{w.goal} • {w.expectedHours}h expected • Status: {w.status}</p>
                  <div className="card subtle">
                    <h4>Lecture PDF (this week)</h4>
                    <p className="eyebrow">Upload your own PDF or load the built-in sample. Viewer uses your login token securely (not a public URL).</p>
                    <div className="week-pdf-actions">
                      <input ref={weekPdfInputRef} type="file" accept="application/pdf" className="file-input" />
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => uploadPdfForWeek(weekPdfInputRef.current?.files?.[0])}
                      >
                        Upload PDF
                      </button>
                      <button type="button" className="ghost-btn" onClick={attachSamplePdf}>
                        Load sample lecture PDF
                      </button>
                    </div>
                    {weekMaterials.length > 0 && (
                      <div className="material-picker">
                        {weekMaterials.map((m) => (
                          <label key={m.id} className="material-option">
                            <input
                              type="radio"
                              name="week-pdf"
                              checked={selectedPdfId === m.id}
                              onChange={() => setSelectedPdfId(m.id)}
                            />
                            <span>{m.originalName}</span>
                            <button
                              type="button"
                              className="link-btn"
                              onClick={(e) => {
                                e.preventDefault()
                                removeWeekMaterial(m.id)
                              }}
                            >
                              Remove
                            </button>
                          </label>
                        ))}
                      </div>
                    )}
                    {pdfObjectUrl ? (
                      <iframe title="Week PDF" className="pdf-frame" src={pdfObjectUrl} />
                    ) : (
                      <p className="eyebrow">No PDF attached for this week yet.</p>
                    )}
                  </div>
                  <div className="card subtle">
                    <h4>Study summary (easy read)</h4>
                    <p className="eyebrow">
                      Plain-language recap so you can revise fast. With <code>OPENAI_API_KEY</code> the server uses a tutor-style
                      summary; otherwise it auto-picks important sentences from the PDF — always double-check the original
                      slides.
                    </p>
                    <div className="week-pdf-actions">
                      <button
                        type="button"
                        className="primary-btn"
                        disabled={!selectedPdfId || summarizing}
                        onClick={summarizeSelectedPdf}
                      >
                        {summarizing ? 'Building your summary…' : 'Build easy-read summary'}
                      </button>
                      <button
                        type="button"
                        className="ghost-btn"
                        disabled={!lectureSummaries[noteKey]}
                        onClick={appendSummaryToNotes}
                      >
                        Append summary to notes
                      </button>
                    </div>
                    {lectureSummaries[noteKey] && (
                      <div className="summary-box" role="region" aria-label="Easy-read study summary">
                        <div className="summary-box-glow" aria-hidden />
                        <div className="summary-box-ribbon" aria-hidden />
                        <header className="summary-box-head">
                          <div className="summary-box-brand">
                            <div className="summary-box-icon-wrap">
                              <Sparkles size={20} strokeWidth={1.75} aria-hidden />
                            </div>
                            <div className="summary-box-titles">
                              <p className="summary-box-title">Your revision digest</p>
                              <p className="summary-box-tagline">Read step 1 first — it is the big picture</p>
                            </div>
                          </div>
                          <span className="summary-box-source-pill" title="How this summary was made">
                            {lectureSummaries[noteKey].source === 'openai' ? 'AI tutor style' : 'PDF skim (no AI)'}
                          </span>
                        </header>
                        <div className="summary-box-scroll" tabIndex={0}>
                          {splitSummaryForStudents(lectureSummaries[noteKey].text).map((block, i, arr) => (
                            <div key={i} className="summary-stop">
                              <div className="summary-stop-rail" aria-hidden>
                                <span className="summary-stop-num">{i + 1}</span>
                                {i < arr.length - 1 ? <span className="summary-stop-line" /> : null}
                              </div>
                              <div className="summary-stop-body">{renderSummaryBlock(block)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="card subtle">
                    <h4>Notes</h4>
                    <textarea
                      className="notes-area"
                      placeholder="Write your notes here..."
                      value={notes[noteKey] || ''}
                      onChange={(e) => saveNote(e.target.value)}
                    />
                    <p className="eyebrow">Saved automatically for this module + week.</p>
                  </div>
                </div>
              )
            })()}
          </section>
          <section className="card">
            <h3>Assignments for this module</h3>
            <div className="deadline-list">
              {selectedModule.assignments.map((item) => (
                <article key={item.id} className="deadline-item yellow deadline-item-compact">
                  <div>
                    <strong>{item.name}</strong>
                    <p className="deadline-date-line">{formatAssignmentDueLine(item)}</p>
                  </div>
                  <div>
                    <p>{item.progress}% done</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="card">Select a module first.</section>
      )}
    </div>
  )

  const renderTasks = () => {
    const sorted = [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed))
    return (
      <div className="single-column">
        <section className="card">
          <h3>Task Management</h3>
          <p>Create tasks, link them to a module/week, and track completion.</p>
          <div className="admin-form">
            <input placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))} />
            <input type="date" value={newTask.dueDate} onChange={(e) => setNewTask((p) => ({ ...p, dueDate: e.target.value }))} />
            <select value={newTask.priority} onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value }))}>
              <option>High</option><option>Medium</option><option>Low</option>
            </select>
            <select value={newTask.moduleId} onChange={(e) => setNewTask((p) => ({ ...p, moduleId: e.target.value }))}>
              <option value="">Link to current module</option>
              {data.modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.termLabel || `Term ${m.term ?? 1}`})
                </option>
              ))}
            </select>
            <input placeholder="Week (optional)" value={newTask.week} onChange={(e) => setNewTask((p) => ({ ...p, week: e.target.value }))} />
            <button className="primary-btn" onClick={addNewTask}>Add Task</button>
          </div>
        </section>
        <section className="card">
          <h3>Your Tasks</h3>
          <div className="audit-list">
            {sorted.map((t) => (
              <div className="audit-item" key={t.id}>
                <div className="task-row">
                  <label className="task-check">
                    <input type="checkbox" checked={t.completed} onChange={(e) => updateTaskItem(t.id, { completed: e.target.checked })} />
                    <strong className={t.completed ? 'muted' : ''}>{t.title}</strong>
                  </label>
                  <button className="logout-btn" onClick={() => deleteTaskItem(t.id)}><Trash2 size={14} />Delete</button>
                </div>
                <small>
                  {t.priority} • {t.dueDate ? `Due ${t.dueDate}` : 'No due date'} • {t.week ? `Week ${t.week}` : 'No week'} •{' '}
                  {t.moduleId ? `Linked to module` : 'General'}
                </small>
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  const renderDeadlines = () => (
    <div className="single-column deadlines-page">
      <section className="card">
        <h3>Deadlines by term</h3>
        <p className="eyebrow">Each block lists assessments in date order. Due dates are generated from the countdown in demo data.</p>
        {deadlinesByTerm.map((group) => (
          <div key={group.term} className="deadline-term-block">
            <h4 className="deadline-term-heading">{group.termLabel}</h4>
            <div className="deadline-list">
              {group.items.map((item) => (
                <article key={item.id} className={`deadline-item ${item.status.tone}`}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.moduleName}</p>
                    <p className="deadline-date-line">{formatAssignmentDueLine(item)}</p>
                  </div>
                  <div>
                    <p>{item.progress}% done</p>
                    <small className="deadline-urgency-note">{item.dueInDays} days to deadline</small>
                  </div>
                  <span className={`badge ${item.status.tone}`}>{item.status.label}</span>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )

  const renderInsights = () => (
    <div className="page-grid insights-grid">
      <section className="card chart-card"><h3>Study Time (Hours)</h3><ResponsiveContainer width="100%" height={250}><LineChart data={data.insights.studyTime}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Line dataKey="hours" stroke="#5b6cff" strokeWidth={3} /></LineChart></ResponsiveContainer></section>
      <section className="card chart-card"><h3>Module Performance</h3><ResponsiveContainer width="100%" height={250}><BarChart data={data.insights.modulePerformance}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="progress">{data.insights.modulePerformance.map((module) => <Cell key={module.id} fill={module.progress < 40 ? '#ff6b6b' : module.progress < 65 ? '#f5b041' : '#4cd087'} />)}</Bar></BarChart></ResponsiveContainer></section>
      <section className="card insight-summary-card"><h3>Summary</h3><p>{data.insights.summary}</p><p>Completion rate: {data.insights.completionRate}%</p><p>Risk indicator: <span className={`badge ${data.insights.riskIndicator.tone}`}>{data.insights.riskIndicator.label}</span></p><p>If you continue like this: <strong>{data.insights.predictivePerformance}</strong></p></section>
      <section className="card insight-focus-card"><h3>Focus Mode</h3><p>Start a study session and track active time.</p><label htmlFor="focus-module" className="label">Selected module</label><select id="focus-module" value={focusModule} onChange={(e) => updatePreference(e.target.value)} className="select-input">{data.modules.map((module) => <option key={module.id} value={module.id}>{module.name} ({module.termLabel || `Term ${module.term ?? 1}`})</option>)}</select><div className="focus-controls"><button className="primary-btn" onClick={toggleFocusSession}><Play size={14} />{isFocusActive ? 'Pause Session' : 'Start Study Session'}</button><button className="ghost-btn" onClick={resetFocusSession}>Reset</button></div><strong className="focus-time">{formatTime(focusSeconds)}</strong></section>
    </div>
  )

  const renderAdmin = () => (
    <div className="single-column">
      <section className="card">
        <h3>Admin: UEL Moodle Connector</h3>
        <div className="admin-form">
          <input
            placeholder="Moodle Base URL (e.g. https://moodle.uel.ac.uk)"
            value={moodleConfig.baseUrl}
            onChange={(e) => setMoodleConfig((p) => ({ ...p, baseUrl: e.target.value }))}
          />
          <input
            placeholder="Moodle Web Service Token"
            value={moodleConfig.token}
            onChange={(e) => setMoodleConfig((p) => ({ ...p, token: e.target.value }))}
          />
          <select
            value={moodleConfig.enabled ? 'enabled' : 'disabled'}
            onChange={(e) => setMoodleConfig((p) => ({ ...p, enabled: e.target.value === 'enabled' }))}
          >
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
          <button className="ghost-btn" onClick={saveMoodleConnector}>Save Connector</button>
          <input
            placeholder="Moodle Username"
            value={moodleCreds.username}
            onChange={(e) => setMoodleCreds((p) => ({ ...p, username: e.target.value }))}
          />
          <input
            placeholder="Moodle Password"
            type="password"
            value={moodleCreds.password}
            onChange={(e) => setMoodleCreds((p) => ({ ...p, password: e.target.value }))}
          />
          <input
            placeholder="Service (default: moodle_mobile_app)"
            value={moodleCreds.service}
            onChange={(e) => setMoodleCreds((p) => ({ ...p, service: e.target.value }))}
          />
          <button className="ghost-btn" onClick={generateMoodleTokenFromCredentials}>Generate Token</button>
          <button className="ghost-btn" onClick={testMoodleConnector}>Test Connection</button>
          <button className="ghost-btn" onClick={runMoodleDiagnostics}>Run Diagnostics</button>
          <button className="primary-btn" onClick={importMoodleCourses}>Import Moodle Courses</button>
        </div>
        {moodleStatus && <p className="eyebrow">{moodleStatus}</p>}
        {moodleDiagnostics.length > 0 && (
          <div className="audit-list">
            {moodleDiagnostics.map((item) => (
              <div key={item.name} className="audit-item">
                <strong>{item.name}: {item.ok ? 'OK' : 'Failed'}</strong>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="card">
        <h3>Admin: Add Module</h3>
        <div className="admin-form">
          <input placeholder="Code" value={newModule.code} onChange={(e) => setNewModule((p) => ({ ...p, code: e.target.value }))} />
          <input placeholder="Title" value={newModule.title} onChange={(e) => setNewModule((p) => ({ ...p, title: e.target.value }))} />
          <input placeholder="Academic year" value={newModule.academicYear} onChange={(e) => setNewModule((p) => ({ ...p, academicYear: e.target.value }))} />
          <input placeholder="Level" type="number" value={newModule.level} onChange={(e) => setNewModule((p) => ({ ...p, level: e.target.value }))} />
          <input placeholder="Term" type="number" value={newModule.term} onChange={(e) => setNewModule((p) => ({ ...p, term: e.target.value }))} />
          <input placeholder="Grade (optional)" type="number" value={newModule.grade} onChange={(e) => setNewModule((p) => ({ ...p, grade: e.target.value }))} />
          <select value={newModule.status} onChange={(e) => setNewModule((p) => ({ ...p, status: e.target.value }))}>
            <option>In Progress</option><option>Pass</option><option>Planned</option>
          </select>
          <textarea placeholder="Assessments, one per line" value={newModule.assessmentsText} onChange={(e) => setNewModule((p) => ({ ...p, assessmentsText: e.target.value }))} />
          <button className="primary-btn" onClick={createModule}>Add Module</button>
        </div>
      </section>
      <section className="card">
        <h3>Admin: Edit All Modules ({adminModules.length})</h3>
        <div className="admin-module-list">
          {adminModules.map((module) => (
            <div key={module.id} className="admin-module-item">
              <input value={module.code} onChange={(e) => setAdminModules((arr) => arr.map((m) => (m.id === module.id ? { ...m, code: e.target.value } : m)))} />
              <input value={module.title} onChange={(e) => setAdminModules((arr) => arr.map((m) => (m.id === module.id ? { ...m, title: e.target.value } : m)))} />
              <input type="number" value={module.grade ?? ''} onChange={(e) => setAdminModules((arr) => arr.map((m) => (m.id === module.id ? { ...m, grade: e.target.value === '' ? null : Number(e.target.value) } : m)))} />
              <select value={module.status} onChange={(e) => setAdminModules((arr) => arr.map((m) => (m.id === module.id ? { ...m, status: e.target.value } : m)))}>
                <option>In Progress</option><option>Pass</option><option>Planned</option>
              </select>
              <button className="ghost-btn" onClick={() => updateAdminModule(module.id, module)}>Save</button>
              <button className="logout-btn" onClick={() => removeAdminModule(module.id)}><Trash2 size={14} />Delete</button>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h3>Admin: CSV Import Modules</h3>
        <p className="eyebrow">Columns: academicyear,code,title,level,term,grade,status,assessments (use | separator inside assessments)</p>
        <textarea className="select-input" rows={6} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="academicyear,code,title,level,term,grade,status,assessments" />
        <button className="primary-btn" onClick={importModulesCsv}>Import CSV</button>
      </section>
      <section className="card">
        <h3>Admin: Student Management ({adminStudents.length})</h3>
        <div className="admin-form">
          <input placeholder="Name" value={newStudent.name} onChange={(e) => setNewStudent((p) => ({ ...p, name: e.target.value }))} />
          <input placeholder="Email" value={newStudent.email} onChange={(e) => setNewStudent((p) => ({ ...p, email: e.target.value }))} />
          <input placeholder="Student ID" value={newStudent.studentId} onChange={(e) => setNewStudent((p) => ({ ...p, studentId: e.target.value }))} />
          <input placeholder="Course" value={newStudent.course} onChange={(e) => setNewStudent((p) => ({ ...p, course: e.target.value }))} />
          <input type="number" placeholder="Level" value={newStudent.level} onChange={(e) => setNewStudent((p) => ({ ...p, level: e.target.value }))} />
          <input placeholder="Intake" value={newStudent.intake} onChange={(e) => setNewStudent((p) => ({ ...p, intake: e.target.value }))} />
          <select value={newStudent.status} onChange={(e) => setNewStudent((p) => ({ ...p, status: e.target.value }))}>
            <option>Active</option><option>At Risk</option><option>Paused</option>
          </select>
          <button className="primary-btn" onClick={createStudent}>Add Student</button>
        </div>
        <div className="admin-module-list">
          {adminStudents.map((student) => (
            <div key={student.id} className="admin-module-item">
              <input value={student.name} onChange={(e) => setAdminStudents((arr) => arr.map((s) => (s.id === student.id ? { ...s, name: e.target.value } : s)))} />
              <input value={student.email} onChange={(e) => setAdminStudents((arr) => arr.map((s) => (s.id === student.id ? { ...s, email: e.target.value } : s)))} />
              <input value={student.studentId || ''} onChange={(e) => setAdminStudents((arr) => arr.map((s) => (s.id === student.id ? { ...s, studentId: e.target.value } : s)))} />
              <select value={student.status} onChange={(e) => setAdminStudents((arr) => arr.map((s) => (s.id === student.id ? { ...s, status: e.target.value } : s)))}>
                <option>Active</option><option>At Risk</option><option>Paused</option>
              </select>
              <button className="ghost-btn" onClick={() => updateAdminStudent(student.id, student)}>Save</button>
              <button className="logout-btn" onClick={() => removeAdminStudent(student.id)}><Trash2 size={14} />Delete</button>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h3>Admin: Audit Logs</h3>
        <div className="audit-list">
          {auditLogs.map((log) => (
            <div className="audit-item" key={log.id}>
              <strong>{log.action}</strong> {log.targetType} {log.detail}
              <small>{new Date(log.createdAt).toLocaleString()} • {log.actorName}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  )

  const pageContent = {
    dashboard: renderDashboard(),
    assistant: renderAssistant(),
    modules: renderModules(),
    moduleWorkspace: renderModuleWorkspace(),
    tasks: renderTasks(),
    deadlines: renderDeadlines(),
    insights: renderInsights(),
    admin: user.role === 'admin' ? renderAdmin() : <section className="card">Admin access required.</section>,
  }

  const pages = user.role === 'admin' ? [...basePages, { id: 'admin', label: 'Admin', icon: Shield }] : basePages

  return (
    <div className="app-shell">
      <Motion.aside
        className="sidebar"
        initial={reduceMotion === true ? false : { x: -28, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={
          reduceMotion === true ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 32, mass: 0.85 }
        }
      >
        <Motion.div
          className="brand"
          initial={reduceMotion === true ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion === true ? 0 : 0.08, duration: 0.35 }}
        >
          <span>UEL</span>
          <strong>Survival System</strong>
        </Motion.div>
        <nav>
          {pages.map((page) => {
            const Icon = page.icon
            return (
              <Motion.button
                key={page.id}
                type="button"
                className={`nav-item ${activePage === page.id ? 'active' : ''}`}
                onClick={() => setActivePage(page.id)}
                layout
                whileHover={reduceMotion === true ? undefined : { x: 5 }}
                whileTap={reduceMotion === true ? undefined : { scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              >
                <Icon size={16} />
                {page.label}
              </Motion.button>
            )
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-motivation" role="status" aria-live="polite" aria-atomic="true">
            <Sparkles size={16} className="sidebar-motivation-icon" aria-hidden />
            <Motion.p
              key={motivationIndex}
              className="sidebar-motivation-text"
              initial={reduceMotion === true ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion === true ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {SIDEBAR_MOTIVATION_LINES[motivationIndex]}
            </Motion.p>
          </div>
          <Motion.button
            type="button"
            className="ghost-btn"
            onClick={toggleTheme}
            whileTap={reduceMotion === true ? undefined : { scale: 0.97 }}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />} {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </Motion.button>
          <Motion.button
            type="button"
            className="logout-btn"
            onClick={logout}
            whileTap={reduceMotion === true ? undefined : { scale: 0.97 }}
          >
            <LogOut size={14} />
            Log out
          </Motion.button>
        </div>
      </Motion.aside>
      <main className="content">
        {error && <section className="error-banner">{error}</section>}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <Motion.section
              key="loading"
              className="card loading-surface"
              initial={reduceMotion === true ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion === true ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion === true ? 0 : 0.25 }}
            >
              <div className="loading-shimmer" aria-hidden />
              <p>Loading your survival dashboard...</p>
            </Motion.section>
          ) : (
            <Motion.div
              key={activePage}
              className="page-transition-root"
              initial={reduceMotion === true ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion === true ? undefined : { opacity: 0, y: -14 }}
              transition={
                reduceMotion === true
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 380, damping: 34, mass: 0.82 }
              }
            >
              {pageContent[activePage]}
            </Motion.div>
          )}
        </AnimatePresence>
        <Motion.button
          type="button"
          className="refresh-btn"
          onClick={loadData}
          whileHover={reduceMotion === true ? undefined : { y: -2, scale: 1.02 }}
          whileTap={reduceMotion === true ? undefined : { scale: 0.97 }}
        >
          Refresh Synthetic Dataset
        </Motion.button>
      </main>
    </div>
  )
}

export default App
