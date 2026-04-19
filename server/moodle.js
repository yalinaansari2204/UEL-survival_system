const buildWsUrl = (baseUrl) => {
  const normalized = String(baseUrl || '').replace(/\/+$/, '')
  return `${normalized}/webservice/rest/server.php`
}

const buildTokenUrl = (baseUrl) => {
  const normalized = String(baseUrl || '').replace(/\/+$/, '')
  return `${normalized}/login/token.php`
}

const moodleCall = async ({ baseUrl, token, wsfunction, params = {} }) => {
  const wsUrl = buildWsUrl(baseUrl)
  const body = new URLSearchParams({
    wstoken: token,
    moodlewsrestformat: 'json',
    wsfunction,
  })
  for (const [key, value] of Object.entries(params)) {
    body.append(key, String(value))
  }
  const response = await fetch(wsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) {
    throw new Error(`Moodle request failed (${response.status})`)
  }
  const payload = await response.json()
  if (payload?.exception) {
    throw new Error(payload.message || payload.errorcode || 'Moodle API error')
  }
  return payload
}

export const generateMoodleToken = async ({ baseUrl, username, password, service = 'moodle_mobile_app' }) => {
  const response = await fetch(buildTokenUrl(baseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username,
      password,
      service,
    }),
  })
  if (!response.ok) {
    throw new Error(`Token request failed (${response.status})`)
  }
  const payload = await response.json()
  if (payload?.error) {
    throw new Error(payload.error)
  }
  if (!payload?.token) {
    throw new Error('Moodle did not return a token')
  }
  return payload.token
}

export const diagnoseMoodleConnection = async ({ baseUrl, token }) => {
  const diagnostics = {
    baseUrl,
    checks: [],
  }
  try {
    const root = await fetch(baseUrl, { method: 'GET' })
    diagnostics.checks.push({
      name: 'Base URL reachable',
      ok: root.ok,
      detail: `HTTP ${root.status}`,
    })
  } catch (err) {
    diagnostics.checks.push({
      name: 'Base URL reachable',
      ok: false,
      detail: err.message || 'Network error',
    })
  }

  try {
    await testMoodleConnection({ baseUrl, token })
    diagnostics.checks.push({
      name: 'Web service token valid',
      ok: true,
      detail: 'Token accepted by core_webservice_get_site_info',
    })
  } catch (err) {
    diagnostics.checks.push({
      name: 'Web service token valid',
      ok: false,
      detail: err.message || 'Token rejected',
    })
  }
  diagnostics.ok = diagnostics.checks.every((item) => item.ok)
  return diagnostics
}

export const testMoodleConnection = async ({ baseUrl, token }) => {
  const siteInfo = await moodleCall({
    baseUrl,
    token,
    wsfunction: 'core_webservice_get_site_info',
  })
  return {
    siteName: siteInfo.sitename || 'Unknown site',
    userName: siteInfo.username || 'Unknown user',
    fullName: siteInfo.fullname || '',
    userId: siteInfo.userid || null,
  }
}

export const fetchMoodleCourses = async ({ baseUrl, token }) => {
  const courses = await moodleCall({
    baseUrl,
    token,
    wsfunction: 'core_course_get_courses',
  })
  if (!Array.isArray(courses)) return []
  return courses
    .filter((course) => Number(course.id) > 1)
    .map((course) => ({
      academicYear: '2025/6',
      code: course.shortname || `MOODLE-${course.id}`,
      title: course.fullname || `Course ${course.id}`,
      level: 6,
      term: 1,
      grade: null,
      status: 'In Progress',
      assessments: ['Imported from Moodle course'],
    }))
}
