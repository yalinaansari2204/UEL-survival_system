const cleanText = (raw) =>
  String(raw || '')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\n.!?]/g, '')
    .trim()

const splitSentences = (text) =>
  cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)

const wordFreq = (text) => {
  const words = text.toLowerCase().match(/[a-z]{4,}/g) || []
  const freq = {}
  for (const w of words) freq[w] = (freq[w] || 0) + 1
  return freq
}

export const extractiveSummary = (rawText, { maxSentences = 6 } = {}) => {
  const text = cleanText(rawText)
  if (!text) return 'No readable text found in this PDF.'
  const sentences = splitSentences(text)
  if (sentences.length === 0) return text.slice(0, 800)

  const freq = wordFreq(text)
  const scored = sentences.map((s, i) => {
    const words = s.toLowerCase().match(/[a-z]{4,}/g) || []
    const score = words.reduce((acc, w) => acc + (freq[w] || 0), 0) + (i < 2 ? 2 : 0)
    return { s, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const picked = scored.slice(0, maxSentences).map((x) => x.s)
  const intro = sentences[0]
  const unique = [intro, ...picked.filter((p) => p !== intro)].filter(Boolean)
  const explain =
    'This is an automatic skim of your PDF (no AI). It picks sentences that repeat important words — use it to see what to read first, then check the full PDF and your lecture notes.'
  const blocks = unique.slice(0, 6).map((line, i) => (i === 0 ? `Big picture:\n${line}` : `- ${line}`))
  return [explain, ...blocks].join('\n\n').trim()
}

export const openAiSummary = async (lectureText) => {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `You are a patient study coach for university students. Many readers speak English as an additional language.

Write a summary they can understand when they are tired or in a hurry. Rules:
- Short sentences. Common words. If you use a technical term, add a plain explanation in brackets the first time (e.g. "mitosis (how a cell splits)").
- Put a BLANK LINE between every section below (double newline). No walls of text.
- Use this structure and these exact section titles (student-friendly):

WHAT THIS LECTURE IS ABOUT
One or two sentences in very plain English.

MAIN POINTS
4 to 7 lines. Each line MUST start with "- " and carry only ONE idea.

WORDS TO KNOW (skip this whole section if there are no important terms)
Up to 4 lines. Each line: "- word or phrase — very short meaning"

QUICK REVISION TIP
One sentence: what to do tonight (e.g. draw a diagram, do two quiz questions, explain aloud in two minutes).

If the PDF text is messy, empty, or not really a lecture, say that honestly in WHAT THIS LECTURE IS ABOUT and still give your best MAIN POINTS from what is there.

Maximum 280 words. No emojis.`,
        },
        {
          role: 'user',
          content: `Here is text extracted from a student's lecture PDF. Summarize it for revision:\n\n${lectureText.slice(0, 12000)}`,
        },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err.slice(0, 200) || 'OpenAI request failed')
  }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty OpenAI response')
  return text.trim()
}
