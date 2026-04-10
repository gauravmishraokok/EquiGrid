const SYSTEM_PROMPT = `You are a utility grid input parser. Your ONLY job is to read a building's stated reason for requesting power and convert it into a structured JSON object. You are NOT allocating power. You are NOT making decisions. You are reading and classifying.

Output ONLY valid JSON. No explanation. No preamble. No markdown. Just the JSON object.

Building context you will receive:
- buildingName: the name of the building
- buildingType: the type (Medical, Emergency, Infrastructure, Commercial, Residential, Educational)
- tier: priority tier (1 = highest, 4 = lowest)
- demandKw: how much power they are requesting
- rawReason: what they typed

You must output:
{
  "urgencyScore": <integer 1-10, where 10 = immediate life risk, 1 = pure comfort>,
  "category": <one of: "life-critical", "infrastructure", "operational", "comfort", "unknown">,
  "riskIfDenied": <string, max 8 words, what happens if this building gets no extra power>,
  "confidence": <float 0-1, how confident you are in your interpretation given the text>,
  "flags": <array of zero or more strings from: ["suspicious", "incomplete", "contradictory", "vague", "reasonable", "urgent", "exaggerated"]>,
  "keywordsDetected": <array of strings, key terms you found meaningful>,
  "interpretedMeaning": <string, max 15 words, plain English summary of what you understood>
}

Rules:
- If rawReason is empty or less than 3 words: set confidence to 0.1, urgencyScore to 1, flags to ["incomplete"]
- If rawReason contradicts the buildingType (e.g., a hospital claiming it needs power for disco lights): set flags to include "suspicious", lower urgencyScore
- If rawReason is in a non-English language: translate and process normally
- If rawReason is gibberish or random characters: urgencyScore = 1, confidence = 0.05, flags = ["incomplete", "suspicious"]
- Never override urgencyScore above 8 for non-Tier-1 buildings regardless of reason
- A Tier-1 building (Medical, Emergency) starts with a floor of urgencyScore 5 minimum`

const FALLBACK = {
  urgencyScore: 1,
  category: 'unknown',
  riskIfDenied: 'unknown',
  confidence: 0,
  flags: ['incomplete'],
  keywordsDetected: [],
  interpretedMeaning: 'Could not parse input',
}

export async function structureReason(building, submission) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) {
    return { ...FALLBACK, processedAt: Date.now(), error: 'No API key configured' }
  }

  const userMessage = `buildingName: ${building.name}
buildingType: ${building.type}
tier: ${building.tier}
demandKw: ${submission.demandKw}
rawReason: ${submission.rawReason}`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 300,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Groq API error:', res.status, errText)
      return { ...FALLBACK, processedAt: Date.now() }
    }

    const data = await res.json()
    const text = data.choices[0].message.content.trim().replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(text)

    const required = ['urgencyScore', 'category', 'riskIfDenied', 'confidence', 'flags', 'keywordsDetected', 'interpretedMeaning']
    for (const f of required) {
      if (!(f in parsed)) return { ...FALLBACK, processedAt: Date.now() }
    }

    return { ...parsed, processedAt: Date.now() }
  } catch (err) {
    console.error('structureReason error:', err)
    return { ...FALLBACK, processedAt: Date.now() }
  }
}
