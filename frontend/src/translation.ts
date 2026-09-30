const languageCodes: Record<string, string> = {
  'English': 'en',
  'తెలుగు': 'te',
  'हिन्दी': 'hi',
  'தமிழ்': 'ta',
  'ಕನ್ನಡ': 'kn',
  'മലയാളം': 'ml',
  'मराठी': 'mr',
  'বাংলা': 'bn',
}

const translationCache = new Map<string, string>()

export async function translateText(text: string, language: string): Promise<string> {
  const target = languageCodes[language]
  if (!target || target === 'en' || !text.trim()) return text
  const cacheKey = `${target}:${text}`
  const cached = translationCache.get(cacheKey)
  if (cached) return cached

  const params = new URLSearchParams({ q: text, langpair: `en|${target}` })
  const response = await fetch(`https://api.mymemory.translated.net/get?${params}`)
  if (!response.ok) throw new Error('Translation service is unavailable.')
  const result = await response.json() as { responseStatus?: number; responseData?: { translatedText?: string } }
  const translated = result.responseData?.translatedText?.trim()
  if (result.responseStatus !== 200 || !translated) throw new Error('Translation was not returned.')
  translationCache.set(cacheKey, translated)
  return translated
}
