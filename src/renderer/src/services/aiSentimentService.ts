/**
 * AI News Sentiment Service
 * - Sends news headlines/text to OpenAI (via Electron proxy) for sentiment analysis
 * - Caches results to avoid repeated API usage
 * - Simple rate-limiting and error handling
 *
 * Usage:
 *   const res = await aiSentimentService.analyzeHeadlines(['headline1', 'headline2']);
 */

import { AISentimentResult } from '../types';

const cache = new Map<string, { result: AISentimentResult; ts: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const RATE_LIMIT_MS = 1000; // minimal spacing between calls
let lastCall = 0;

async function callOpenAI(prompt: string): Promise<any> {
  // This uses the Electron main process proxy `window.electronAPI.apiRequest`
  // which should attach the OpenAI key securely on the main side.
  try {
    const now = Date.now();
    const wait = Math.max(0, RATE_LIMIT_MS - (now - lastCall));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastCall = Date.now();

    const response = await (window as any).electronAPI.apiRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0,
        max_tokens: 256
      })
    });

    return response;
  } catch (err) {
    console.error('AI Sentiment OpenAI call failed', err);
    throw err;
  }
}

function makeCacheKey(texts: string[]) {
  return texts.join('\n').slice(0, 2000);
}

export async function analyzeHeadlines(headlines: string[]): Promise<AISentimentResult> {
  if (!Array.isArray(headlines) || headlines.length === 0) {
    throw new Error('No headlines provided');
  }

  const key = makeCacheKey(headlines);
  const cached = cache.get(key);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    return cached.result;
  }

  const prompt = `Aşağıdaki haber başlıklarının her biri için kısa bir sentiment analizi yap. Her başlık için:\n- sentiment: positive/neutral/negative\n- score: -1.0 ile +1.0 arasında (negatif -> -1, pozitif -> +1)\n- short_reason: 1-2 cümle\nReturn JSON array of objects with fields: title, sentiment, score, short_reason.\n\nHeadlines:\n${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}`;

  try {
    const raw = await callOpenAI(prompt);
    // response structure depends on the proxy implementation; try to parse common shapes
      const text = raw?.data?.choices?.[0]?.message?.content || raw?.choices?.[0]?.message?.content || raw?.data?.choices?.[0]?.text || raw?.text;
      if (!text) throw new Error('Empty AI response');

      // Attempt to parse JSON array from the assistant reply; fallback to line-based mapping
      let parsed: any;
      try {
        const startIdx = text.indexOf('[');
        parsed = startIdx !== -1 ? JSON.parse(text.slice(startIdx)) : JSON.parse(text);
      } catch (e) {
        // fallback: try to extract lines
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
        parsed = lines.map((line: string, idx: number) => ({ title: headlines[idx] || `#${idx + 1}`, sentiment: 'neutral', score: 0, short_reason: line }));
      }

    const result: AISentimentResult = {
      timestamp: Date.now(),
      items: parsed.map((p: any, i: number) => ({
        title: p.title || headlines[i] || '',
        sentiment: (p.sentiment || 'neutral').toLowerCase(),
        score: typeof p.score === 'number' ? p.score : parseFloat(p.score) || 0,
        short_reason: p.short_reason || p.reason || ''
      })),
      summary: ''
    };

    cache.set(key, { result, ts: Date.now() });
    return result;
  } catch (err) {
    console.error('AI Sentiment parse error', err);
    const fallback: AISentimentResult = { timestamp: Date.now(), items: headlines.map(h => ({ title: h, sentiment: 'neutral', score: 0, short_reason: 'AI unavailable' })), summary: 'AI unavailable' };
    return fallback;
  }
}

export function clearCache() {
  cache.clear();
}

/**
 * Get AI second opinion on a trading decision
 * @param payload Contains primaryDecision, symbol, allData, includeNews
 */
export async function getSecondOpinion(payload: {
  primaryDecision: any;
  symbol: string;
  allData: any;
  includeNews: boolean;
}): Promise<any> {
  const { primaryDecision, symbol, allData, includeNews } = payload;

  // Build prompt
  const prompt = `Sen bir kripto trading uzmanısın. Aşağıdaki analizi değerlendir ve ikinci görüşünü paylaş:

## Deterministik Karar Motoru Sonucu:
- Sinyal: ${primaryDecision.verdict}
- Güven: ${(primaryDecision.confidence * 100).toFixed(0)}%
- Skor: ${primaryDecision.score}

## Nedenler:
${primaryDecision.reasons.slice(0, 5).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

## Riskler:
${primaryDecision.risks.length > 0 ? primaryDecision.risks.slice(0, 3).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n') : 'Belirtilmedi'}

## Teknik Veriler:
- Coin: ${symbol}
- Timeframe: ${primaryDecision.timeframe}
- RSI: ${allData.indicators?.rsi?.toFixed(1) || 'N/A'}
- MACD: ${allData.indicators?.macd?.toFixed(2) || 'N/A'}
- Veri Kalitesi: ${(primaryDecision.dataQuality.confidence * 100).toFixed(0)}%

${includeNews ? '## Haber Durumu:\n(Kullanıcı haber analizini talep etti - gerçek haber servisi entegre edilecek)\n' : ''}

GÖREVIN:
1. Deterministik kararı değerlendir (AGREE/DISAGREE/PARTIAL)
2. Kendi tavsiyeni ver (BUY/SELL/HOLD) ve güven skoru (0-1)
3. Detaylı açıklama yap (200-300 kelime)
4. ${includeNews ? 'Haber etkisini yorumla' : ''}
5. 2-3 alternatif senaryo öner

JSON formatında döndür:
{
  "agreement": "AGREE" | "DISAGREE" | "PARTIAL",
  "verdict": "BUY" | "SELL" | "HOLD",
  "confidence": 0.0-1.0,
  "explanation": "detaylı açıklama",
  ${includeNews ? '"newsImpact": "haber yorumu",' : ''}
  "scenarios": ["senaryo1", "senaryo2"]
}

ÖNEMLİ: Kesinlik iddia etme. "Olası", "Eğer X olursa Y" gibi ifadeler kullan.`;

  try {
    const raw = await callOpenAI(prompt);
    const text = raw?.data?.choices?.[0]?.message?.content || raw?.choices?.[0]?.message?.content || raw?.data?.choices?.[0]?.text || raw?.text;
    
    if (!text) throw new Error('Empty AI response');

    // Parse JSON
    let parsed: any;
    try {
      const startIdx = text.indexOf('{');
      parsed = startIdx !== -1 ? JSON.parse(text.slice(startIdx, text.lastIndexOf('}') + 1)) : JSON.parse(text);
    } catch (e) {
      // Fallback parse
      parsed = {
        agreement: 'PARTIAL',
        verdict: primaryDecision.verdict,
        confidence: primaryDecision.confidence * 0.9,
        explanation: text,
        scenarios: []
      };
    }

    return {
      agreement: parsed.agreement || 'PARTIAL',
      verdict: parsed.verdict || primaryDecision.verdict,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : parseFloat(parsed.confidence) || 0.5,
      explanation: parsed.explanation || text.slice(0, 500),
      newsImpact: parsed.newsImpact || undefined,
      scenarios: Array.isArray(parsed.scenarios) ? parsed.scenarios : [],
      timestamp: Date.now()
    };
  } catch (err) {
    console.error('AI second opinion error:', err);
    throw new Error('AI servisi şu anda kullanılamıyor');
  }
}

export default {
  analyzeHeadlines,
  getSecondOpinion,
  clearCache
};
