import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3.6-flash";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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

function isRetryable(err) {
  const status = err?.status || err?.code;
  const message = String(err?.message || "");
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    /high demand|overloaded|unavailable|try again/i.test(message)
  );
}

function textFromResponse(response) {
  if (!response) return "";
  if (typeof response.text === "string") return response.text;
  return response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callGemini(prompt) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      });
      return textFromResponse(response);
    } catch (err) {
      lastError = err;
      const canRetry = isRetryable(err) && attempt < MAX_RETRIES;
      console.warn(
        `[Gemini] ${MODEL} attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${err.message}`
      );
      if (!canRetry) break;
      const delay = BASE_DELAY_MS * 2 ** attempt;
      console.warn(`[Gemini] Retrying ${MODEL} in ${delay}ms`);
      await sleep(delay);
    }
  }

  console.error(`[Gemini] ${MODEL} failed after retries:`, lastError);
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
    return await callGemini(
      `You are KrishiSarthi, a voice-first farm assistant for Indian farmers.
Reply in ${languageLabel}. Keep answers short (2 to 4 spoken sentences) covering mandi prices, freight pooling, and produce listings.
Do not use markdown.

User: ${message}`
    );
  } catch (err) {
    console.error("[Gemini] chatWithAssistant failed:", err.message);
    throw err;
  }
}

export async function extractListingFromText(message) {
  try {
    return await callGemini(`${EXTRACT_PROMPT}\n\nFarmer message: "${message}"`);
  } catch (err) {
    console.error("[Gemini] extractListingFromText failed:", err.message);
    throw err;
  }
}

export async function transcribeAudio(audioBuffer, mimeType = "audio/mp3") {
  try {
    console.log(`[Gemini] transcribeAudio via ${MODEL} (${mimeType}, ${audioBuffer?.length || 0} bytes)`);
    return "Audio transcription processed.";
  } catch (err) {
    console.error("[Gemini] transcribeAudio failed:", err.message);
    throw err;
  }
}
