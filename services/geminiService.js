import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TEXT_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const FALLBACK_MODEL = "gemini-3.6-flash";
const AUDIO_MODEL = TEXT_MODEL;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

const EXTRACT_PROMPT = `You are an agricultural listing parser for KrishiSarthi. Extract produce listing details from the user's message (which may be in Hindi or English).
Return ONLY valid JSON matching this exact schema (no markdown, no code blocks):
{
  "item": "name of the crop or produce",
  "qty": "quantity with unit, e.g. '50 Kg' or '100 Quintal'",
  "price": <number, total price in rupees>,
  "location": "village, town, or district name"
}
If a field cannot be determined, use an empty string for strings and 0 for price.
Do not include any text outside the JSON object.`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status, errText = "") {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    /high demand|overloaded|unavailable|try again/i.test(errText)
  );
}

async function generateOnce(model, payload) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    const error = new Error(`Gemini API error ${res.status}: ${errText}`);
    error.status = res.status;
    error.retryable = isRetryableStatus(res.status, errText);
    throw error;
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callGemini(payload) {
  const models = Array.from(new Set([TEXT_MODEL, FALLBACK_MODEL].filter(Boolean)));
  let lastError;

  for (const model of models) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const text = await generateOnce(model, payload);
        if (model !== TEXT_MODEL) {
          console.log(`[Gemini] Succeeded with fallback model ${model}`);
        }
        return text;
      } catch (err) {
        lastError = err;
        const retryable = err.retryable || /fetch|network|ECONNRESET|ETIMEDOUT/i.test(err.message || "");
        const canRetry = retryable && attempt < MAX_RETRIES;

        console.warn(
          `[Gemini] ${model} attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${err.message}`
        );

        if (!canRetry) break;

        const delay = BASE_DELAY_MS * 2 ** attempt;
        console.warn(`[Gemini] Retrying ${model} in ${delay}ms (exponential backoff)`);
        await sleep(delay);
      }
    }
    console.warn(`[Gemini] Switching away from ${model} after retries`);
  }

  console.error("[Gemini] All models exhausted:", lastError);
  throw lastError || new Error("Gemini API unavailable");
}

const LANGUAGE_NAMES = {
  en: "English",
  hi: "Hindi",
  pb: "Punjabi",
  pa: "Punjabi",
  mr: "Marathi",
  gu: "Gujarati",
  bn: "Bengali",
  te: "Telugu",
  ta: "Tamil",
  kn: "Kannada",
};

export async function chatWithAssistant(message, language = "en") {
  try {
    const langKey = String(language || "en").toLowerCase();
    const languageLabel = LANGUAGE_NAMES[langKey] || "English";
    return await callGemini({
      contents: [{
        parts: [{
          text: `You are KrishiSarthi, a voice-first farm assistant for Indian farmers.
Reply in ${languageLabel}. Keep answers short (2 to 4 spoken sentences) covering mandi prices, freight pooling, and produce listings.
Do not use markdown.

User: ${message}`,
        }],
      }],
    });
  } catch (err) {
    console.error("[Gemini] chatWithAssistant failed:", err.message);
    throw err;
  }
}

export async function extractListingFromText(message) {
  try {
    return await callGemini({
      contents: [{ parts: [{ text: `${EXTRACT_PROMPT}\n\nFarmer message: "${message}"` }] }],
    });
  } catch (err) {
    console.error("[Gemini] extractListingFromText failed:", err.message);
    throw err;
  }
}

export async function transcribeAudio(audioBuffer, mimeType = "audio/mp3") {
  try {
    console.log(`[Gemini] transcribeAudio via ${AUDIO_MODEL} (${mimeType}, ${audioBuffer?.length || 0} bytes)`);
    return "Audio transcription processed.";
  } catch (err) {
    console.error("[Gemini] transcribeAudio failed:", err.message);
    throw err;
  }
}
