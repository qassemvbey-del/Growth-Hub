import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

function getWeatherCondition(code: number): { desc: string; emoji: string } {
  if (code === 0) return { desc: 'Clear sky', emoji: '☀️' }
  if (code >= 1 && code <= 3) return { desc: 'Partly cloudy', emoji: '🌤️' }
  if (code === 45 || code === 48) return { desc: 'Foggy', emoji: '🌫️' }
  if (code >= 51 && code <= 55) return { desc: 'Drizzle', emoji: '🌧️' }
  if (code >= 61 && code <= 65) return { desc: 'Rainy', emoji: '🌧️' }
  if (code >= 71 && code <= 75) return { desc: 'Snowy', emoji: '❄️' }
  if (code >= 80 && code <= 82) return { desc: 'Rain showers', emoji: '🌦️' }
  if (code >= 95) return { desc: 'Thunderstorm', emoji: '⛈️' }
  return { desc: 'Cloudy', emoji: '☁️' }
}

interface CacheEntry {
  temp: number
  emoji: string
  messageAr: string
  messageEn: string
  timestamp: number
}

const weatherCache = new Map<string, CacheEntry>()
const CACHE_TTL = 7200000 // 2 hours strictly

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  // Default fallback static messages
  const fallbackResponse = {
    temp: 24,
    emoji: '☀️',
    messageAr: 'الجو حلو النهاردة، فرصة ممتازة تخلص اللي وراك!',
    messageEn: 'Nice weather today—perfect time to get things done!'
  }

  let rawLat = 31.2001
  let rawLon = 29.9187
  try {
    const latParam = searchParams.get('lat')
    const lonParam = searchParams.get('lon')
    if (latParam) rawLat = parseFloat(latParam)
    if (lonParam) rawLon = parseFloat(lonParam)
    if (isNaN(rawLat)) rawLat = 31.2001
    if (isNaN(rawLon)) rawLon = 29.9187
  } catch (e) {
    console.error('Error parsing lat/lon:', e)
  }

  // Create geo cache key rounded to 1 decimal place (e.g. 31.2_29.9)
  const latRounded = Math.round(rawLat * 10) / 10
  const lonRounded = Math.round(rawLon * 10) / 10
  const cacheKey = `${latRounded}_${lonRounded}`

  const now = Date.now()

  try {
    // Check in-memory cache hit
    const cached = weatherCache.get(cacheKey)
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      console.log(`WEATHER_CACHE_HIT for key: ${cacheKey}`)
      return NextResponse.json({
        temp: cached.temp,
        emoji: cached.emoji,
        messageAr: cached.messageAr,
        messageEn: cached.messageEn
      })
    }
    
    console.log(`WEATHER_CACHE_MISS for key: ${cacheKey}`)

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${rawLat}&longitude=${rawLon}&current_weather=true`
    const weatherRes = await fetch(weatherUrl, { next: { revalidate: 7200 } }) // Cache weather for 2 hours in network context
    
    if (!weatherRes.ok) {
      throw new Error(`Weather API returned status ${weatherRes.status}`)
    }

    const weatherData = await weatherRes.json()
    const current = weatherData?.current_weather
    if (!current) {
      throw new Error('No current weather data found in Open-Meteo response')
    }

    const temp = Math.round(current.temperature)
    const code = current.weathercode
    const condition = getWeatherCondition(code)

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn('Weather AI Integration: GEMINI API key is missing. Using fallback messages.')
      const noApiKeyRes = {
        temp,
        emoji: condition.emoji,
        messageAr: 'الجو النهاردة مشجع على الإنجاز، ابدأ وركز!',
        messageEn: 'Today is a great day to make progress—let\'s get started!'
      }
      // Cache even the no-apiKey response to avoid weather service flood
      weatherCache.set(cacheKey, {
        ...noApiKeyRes,
        timestamp: now
      })
      return NextResponse.json(noApiKeyRes)
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

    const prompt = `You are a helpful, minimalist life assistant inside a focus/productivity hub. 
The user's current weather is ${temp}°C and condition is ${condition.desc}. 

Generate a single, very short, natural and friendly phrase (Max 8-10 words) encouraging them to focus or plan their day based on this weather. 
Do NOT use military, sci-fi, or robotic jargon. Keep it completely natural, human, and friendly. 
Provide the response in Arabic (Egyptian dialect, warm tone) and a matching clean English version.

Output ONLY a valid JSON object of the format:
{
  "messageAr": "الجو جميل بره، فرصة حلوة تركز وتنجز وراك!",
  "messageEn": "Beautiful weather outside—perfect time to focus and get things done!"
}
No markdown, no explanation, just JSON.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const successResponse = {
      temp,
      emoji: condition.emoji,
      messageAr: parsed.messageAr || fallbackResponse.messageAr,
      messageEn: parsed.messageEn || fallbackResponse.messageEn
    }

    // Set cache entry
    weatherCache.set(cacheKey, {
      ...successResponse,
      timestamp: now
    })

    return NextResponse.json(successResponse)
  } catch (error) {
    console.error('WEATHER_API_ROUTE_ERROR:', error)
    // Seamless fallback so dashboard render never breaks
    return NextResponse.json(fallbackResponse)
  }
}
