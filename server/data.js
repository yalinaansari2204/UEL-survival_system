const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const MS_PER_DAY = 86400000

const termLabelFor = (academicYear, term) => {
  const t = Number(term) || 1
  const y = academicYear != null ? String(academicYear).trim() : ''
  if (y) return `${y} · Term ${t}`
  return `Term ${t}`
}

const enrichAssignmentDates = (assignment) => {
  const due = new Date()
  due.setHours(12, 0, 0, 0)
  due.setTime(due.getTime() + assignment.dueInDays * MS_PER_DAY)
  return {
    ...assignment,
    dueDate: due.toISOString(),
    dueDateLabel: due.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  }
}

const baseModules = [
  {
    id: 'programming',
    name: 'Programming',
    term: 1,
    academicYear: '2025/6',
    baseProgress: 68,
    commonMistakes: ['Skipping pseudocode before coding', 'Weak test coverage'],
    assignments: [
      { id: 'prog-cw1', name: 'API Coursework', dueInDays: 8, progress: 65 },
      { id: 'prog-lab', name: 'Lab Reflection', dueInDays: 4, progress: 80 },
    ],
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    term: 1,
    academicYear: '2025/6',
    baseProgress: 56,
    commonMistakes: ['Rushing derivation steps', 'Not revising solved examples'],
    assignments: [
      { id: 'math-hw', name: 'Maths Homework', dueInDays: 5, progress: 60 },
      { id: 'math-quiz', name: 'Quiz Revision Set', dueInDays: 10, progress: 42 },
    ],
  },
  {
    id: 'ai-fundamentals',
    name: 'AI Fundamentals',
    term: 2,
    academicYear: '2025/6',
    baseProgress: 30,
    commonMistakes: ['Vague model assumptions', 'Missing evaluation metrics'],
    assignments: [
      { id: 'ai-report', name: 'AI Report', dueInDays: 2, progress: 20 },
      { id: 'ai-presentation', name: 'Mini Presentation', dueInDays: 7, progress: 35 },
    ],
  },
]

const getDeadlineStatus = (assignment) => {
  if (assignment.dueInDays <= 2 && assignment.progress < 40) return { label: 'Urgent', tone: 'red' }
  if (assignment.dueInDays <= 5 || assignment.progress < 60) return { label: 'Warning', tone: 'yellow' }
  return { label: 'Safe', tone: 'green' }
}

const getModuleRisk = (module) => {
  const nearDeadlineLowProgress = module.assignments.some((item) => item.dueInDays <= 3 && item.progress < 40)
  if (nearDeadlineLowProgress || module.progress < 40) return 'High'
  if (module.progress < 65) return 'Medium'
  return 'Low'
}

const getOverallStatus = (modules) => {
  if (modules.some((module) => getModuleRisk(module) === 'High')) return { label: 'Falling Behind', tone: 'red' }
  if (modules.some((module) => getModuleRisk(module) === 'Medium')) return { label: 'At Risk', tone: 'yellow' }
  return { label: 'On Track', tone: 'green' }
}

const getRecommendation = (modules) => {
  const ranked = modules
    .flatMap((module) =>
      module.assignments.map((assignment) => ({
        ...assignment,
        moduleName: module.name,
        urgencyScore: (10 - assignment.dueInDays) * 8 + (100 - assignment.progress),
      })),
    )
    .sort((a, b) => b.urgencyScore - a.urgencyScore)

  const top = ranked[0]
  const priority = top.dueInDays <= 2 || top.progress < 35 ? 'High' : top.dueInDays <= 5 ? 'Medium' : 'Low'
  return {
    task: `Work on ${top.name} (${top.moduleName})`,
    estimate: top.progress < 40 ? '1-2 hours' : '45-90 minutes',
    priority,
    rationale:
      top.dueInDays <= 3 ? 'Closest deadline with low completion.' : 'Lowest progress area needs momentum.',
  }
}

const buildStudyWeeks = (moduleName, progress) =>
  Array.from({ length: 12 }, (_, i) => {
    const week = i + 1
    return {
      week,
      topic: `${moduleName} - Week ${week} core topic`,
      goal: week % 3 === 0 ? 'Revision and quiz practice' : 'Lecture review and guided exercises',
      status: week <= Math.floor(progress / 10) ? 'Completed' : week <= Math.floor(progress / 8) ? 'Current' : 'Upcoming',
      expectedHours: week % 2 === 0 ? 4 : 3,
      moodleMaterials: [],
      summary: '',
    }
  })

// (duplicate removed)

export const buildSyntheticData = ({ sessionCount = 0, sourceModules = [] } = {}) => {
  if (sourceModules.length > 0) {
    const normalized = sourceModules.map((module) => ({
      id: module.id,
      name: `${module.code} - ${module.title}`,
      term: Number(module.term) || 1,
      academicYear: module.academicYear != null ? String(module.academicYear) : '',
      progress:
        typeof module.grade === 'number'
          ? Math.max(40, Math.min(100, module.grade))
          : module.status === 'Planned'
            ? 15
            : module.status === 'In Progress'
              ? 35
              : 70,
      studyHours: Number((Math.random() * 4 + 2).toFixed(1)),
      commonMistakes: ['Delayed start on coursework', 'Limited weekly revision consistency'],
      assignments: (module.assessments || []).slice(0, 2).map((item, index) => ({
        id: `${module.id}-a-${index + 1}`,
        name: item,
        dueInDays: Math.max(1, Math.floor(Math.random() * 14) + 1),
        progress: module.status === 'Pass' ? 100 : Math.max(10, Math.floor(Math.random() * 70)),
      })),
    }))
    return buildSyntheticDataFromNormalized(normalized, sessionCount)
  }

  return buildSyntheticDataFromNormalized(
    baseModules.map((module) => ({ ...module, progress: module.baseProgress, studyHours: 5 })),
    sessionCount,
  )
}

const buildSyntheticDataFromNormalized = (initialModules, sessionCount) => {
  const modules = initialModules.map((module) => {
    const term = Number(module.term) || 1
    const academicYear = module.academicYear != null ? String(module.academicYear) : ''
    const termLabel = termLabelFor(academicYear, term)
    const progress = Math.max(10, Math.min(95, Number(module.progress || 50) + randomInt(-6, 6)))
    const assignments = module.assignments.map((item) => {
      const adjusted = {
        ...item,
        dueInDays: Math.max(1, item.dueInDays + randomInt(-1, 1)),
        progress: Math.max(10, Math.min(95, item.progress + randomInt(-10, 10))),
      }
      return enrichAssignmentDates(adjusted)
    })
    const studyHours = Number((Math.max(2, progress / 10 + randomInt(-2, 2)) + Math.random()).toFixed(1))
    return { ...module, term, academicYear, termLabel, progress, studyHours, assignments }
  })
  const modulesWithWeeks = modules.map((module) => ({
    ...module,
    studyWeeks: buildStudyWeeks(module.name, module.progress),
  }))

  const deadlines = modulesWithWeeks
    .flatMap((module) =>
      module.assignments.map((assignment) => ({
        ...assignment,
        moduleName: module.name,
        moduleId: module.id,
        term: module.term,
        termLabel: module.termLabel,
        status: getDeadlineStatus(assignment),
      })),
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  const weeklyStudyData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
    day,
    hours: Number((Math.random() * 2.8 + 0.6 + Math.min(sessionCount, 5) * 0.1).toFixed(1)),
  }))

  const averageProgress = Math.round(
    modulesWithWeeks.reduce((sum, module) => sum + module.progress, 0) / modulesWithWeeks.length,
  )
  const completionRate = Math.round(
    (deadlines.reduce((sum, assignment) => sum + assignment.progress, 0) / (deadlines.length * 100)) * 100,
  )
  const overallStatus = getOverallStatus(modulesWithWeeks)
  const atRiskModules = modulesWithWeeks.filter((module) => getModuleRisk(module) === 'High').length
  const soonDeadlines = deadlines.filter((item) => item.dueInDays <= 5).length

  const prediction = averageProgress > 70 ? 'Good' : averageProgress > 50 ? 'Average' : 'Poor'
  const summary = averageProgress >= 60 ? 'You are improving' : 'You are falling behind'
  const lightestModule = [...modulesWithWeeks].sort((a, b) => a.progress - b.progress)[0]
  const weeklyGuide = [
    `Complete first draft for ${deadlines[0]?.name || 'nearest assignment'}`,
    `Focus on ${lightestModule?.name || 'your weakest module'} for two focused sessions`,
    'Run one timed revision session for your hardest topic',
    'Export this week’s notes into a single “cheat sheet” you can skim before class',
    'Send one accountability message to a classmate—25 minutes on the same brief helps both of you',
    'Skim learning outcomes before reopening slides—questions first, answers second',
  ]

  const weeklyHoursTotal = weeklyStudyData.reduce((sum, d) => sum + d.hours, 0)
  const dueSoon = deadlines.filter((d) => d.dueInDays <= 7).length

  return {
    generatedAt: new Date().toISOString(),
    dashboard: {
      overallStatus,
      topPriorityTask: getRecommendation(modulesWithWeeks),
      upcomingDeadlines: deadlines.slice(0, 3),
      weeklyProgress: { week: 6, percent: 46 },
      alerts: [
        atRiskModules > 0 ? `You are falling behind in ${atRiskModules} module` : 'All modules are stable',
        `${soonDeadlines} deadlines are approaching soon`,
        'No study activity in 3 days',
      ],
      quickStats: [
        { label: 'Active modules', value: String(modulesWithWeeks.length), hint: 'Linked this term (synthetic)' },
        { label: 'Average progress', value: `${averageProgress}%`, hint: 'Across all modules' },
        { label: 'Due inside 7 days', value: String(dueSoon), hint: 'Assignments on your radar' },
        { label: 'Study curve (wk)', value: `${weeklyHoursTotal.toFixed(1)}h`, hint: 'Sum of synthetic daily hours' },
      ],
      studyStreak: {
        days: Math.min(14, 2 + Math.floor(sessionCount / 2) + randomInt(0, 3)),
        message: 'Short weekday sessions still count—protect the streak on tired days.',
      },
      focusBlock: {
        title: 'Suggested focus block',
        window: 'Tonight 19:30–21:15',
        detail: `Anchor ${modulesWithWeeks[0]?.name || 'your heaviest module'} while distractions are naturally lower.`,
      },
      modulePulse: modulesWithWeeks
        .map((m) => ({
          id: m.id,
          name: m.name,
          progress: m.progress,
          hours: m.studyHours,
          term: m.term,
          termLabel: m.termLabel,
        }))
        .slice(0, 4),
      campusReminders: [
        'Rename files with module codes before upload—markers notice consistent naming.',
        'Capture “confusion questions” after each lecture; reuse them before revision week.',
      ],
    },
    modules: modulesWithWeeks,
    deadlines,
    assistant: {
      recommendation: getRecommendation(modulesWithWeeks),
      weeklyGuide,
      studyTips: [
        'Batch shallow tasks (email, forum posts) into one 20-minute sprint after lunch.',
        'When energy dips, switch to passive review: walk-and-recite or annotated readings.',
        'Use the two-minute rule: if a follow-up takes less than two minutes, do it before logging off.',
        'End each session with one sentence: “What moved?”—makes tomorrow’s start obvious.',
      ],
      deepDives: [
        {
          title: 'Tame cascading deadlines',
          body: 'Rank work by (grade weight × urgency). Protect one anchor task per day so progress stays visible when new briefs appear.',
        },
        {
          title: 'Module risk → daily action',
          body: 'If a module reads “High”, schedule two 40-minute blocks before adding new tasks. Momentum beats heroic all-nighters.',
        },
      ],
      campusNotes: [
        {
          title: 'Moodle + calendars',
          detail: 'This dashboard is synthetic—in production, mirror official Moodle deadlines to avoid drift.',
        },
        {
          title: 'Library & pods',
          detail: 'Quiet floors and bookable pods fill fast near deadlines—reserve early in the week.',
        },
      ],
    },
    insights: {
      studyTime: weeklyStudyData,
      completionRate,
      modulePerformance: modules.map(({ id, name, progress }) => ({ id, name, progress })),
      summary,
      riskIndicator: overallStatus,
      predictivePerformance: prediction,
    },
  }
}
