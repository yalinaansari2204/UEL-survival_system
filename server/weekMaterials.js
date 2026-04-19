import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { PDFParse } from 'pdf-parse'
import { addWeekMaterial, deleteWeekMaterial, getWeekMaterialById, getWeekMaterials } from './db.js'
import { requireAuth } from './middleware.js'
import { extractiveSummary, openAiSummary } from './summarize.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const uploadsDir = path.join(__dirname, 'uploads')

export const registerWeekMaterialRoutes = (app) => {
  fs.mkdirSync(uploadsDir, { recursive: true })

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safe = `${Date.now()}-${String(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')}`
      cb(null, safe)
    },
  })
  const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } })

  app.get('/api/week-materials', requireAuth, (req, res) => {
    const { moduleId, week } = req.query
    if (!moduleId || week === undefined || week === '') {
      res.status(400).json({ error: 'moduleId and week are required' })
      return
    }
    const items = getWeekMaterials(req.user.id, moduleId, Number(week))
    res.json(
      items.map(({ id, originalName, week: w, moduleId: mid, createdAt }) => ({
        id,
        originalName,
        week: w,
        moduleId: mid,
        createdAt,
      })),
    )
  })

  app.get('/api/week-materials/:id/file', requireAuth, (req, res) => {
    const material = getWeekMaterialById(req.user.id, req.params.id)
    if (!material) {
      res.status(404).end()
      return
    }
    const filePath = path.join(uploadsDir, material.storedName)
    if (!fs.existsSync(filePath)) {
      res.status(404).end()
      return
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.sendFile(filePath)
  })

  app.post('/api/week-materials', requireAuth, upload.single('file'), (req, res) => {
    const { moduleId, week } = req.query
    if (!moduleId || week === undefined || week === '') {
      res.status(400).json({ error: 'moduleId and week are required' })
      return
    }
    if (!req.file) {
      res.status(400).json({ error: 'PDF file is required' })
      return
    }
    const created = addWeekMaterial({
      userId: req.user.id,
      moduleId,
      week: Number(week),
      storedName: req.file.filename,
      originalName: req.file.originalname,
    })
    res.status(201).json({
      id: created.id,
      originalName: created.originalName,
      week: created.week,
      moduleId: created.moduleId,
      createdAt: created.createdAt,
    })
  })

  app.post('/api/week-materials/attach-sample', requireAuth, (req, res) => {
    const { moduleId, week } = req.body || {}
    if (!moduleId || week === undefined || week === '') {
      res.status(400).json({ error: 'moduleId and week are required' })
      return
    }
    const sampleCandidates = [
      path.join(__dirname, '..', 'public', 'sample-lecture-for-summarizer.pdf'),
      path.join(__dirname, '..', 'dist', 'sample-lecture-for-summarizer.pdf'),
    ]
    const samplePath = sampleCandidates.find((candidate) => fs.existsSync(candidate))
    if (!samplePath) {
      res.status(404).json({ error: 'Sample PDF not found (expected in public/ or dist/)' })
      return
    }
    const storedName = `sample-${Date.now()}.pdf`
    const dest = path.join(uploadsDir, storedName)
    fs.copyFileSync(samplePath, dest)
    const created = addWeekMaterial({
      userId: req.user.id,
      moduleId,
      week: Number(week),
      storedName,
      originalName: 'sample-lecture-for-summarizer.pdf',
    })
    res.status(201).json({
      id: created.id,
      originalName: created.originalName,
      week: created.week,
      moduleId: created.moduleId,
      createdAt: created.createdAt,
    })
  })

  app.delete('/api/week-materials/:id', requireAuth, (req, res) => {
    const material = getWeekMaterialById(req.user.id, req.params.id)
    if (!material) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const filePath = path.join(uploadsDir, material.storedName)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    deleteWeekMaterial(req.user.id, req.params.id)
    res.status(204).send()
  })

  app.post('/api/week-materials/:id/summarize', requireAuth, async (req, res) => {
    const material = getWeekMaterialById(req.user.id, req.params.id)
    if (!material) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const filePath = path.join(uploadsDir, material.storedName)
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File missing' })
      return
    }
    const buffer = fs.readFileSync(filePath)
    let text = ''
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      text = result.text || ''
    } catch (err) {
      res.status(400).json({ error: 'Could not extract text from PDF', detail: err.message })
      return
    } finally {
      await parser.destroy().catch(() => {})
    }
    let summary
    let source = 'extractive'
    try {
      const ai = await openAiSummary(text)
      if (ai) {
        summary = ai
        source = 'openai'
      } else {
        summary = extractiveSummary(text)
      }
    } catch {
      summary = extractiveSummary(text)
    }
    res.json({ summary, source })
  })
}
