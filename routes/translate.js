import { Router } from "express";
import { GoogleGenAI, Type } from "@google/genai";

const router = Router();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

router.post("/", async (req, res) => {
  try {
    const { targetLanguage, texts, text } = req.body || {};

    // Support both single text or array of texts
    const items = Array.isArray(texts)
    ? texts.map((t) => String(t ?? ""))
    : text
    ? [String(text)]
    : [];

    if (!targetLanguage || items.length === 0) {
      return res.status(400).json({
        error: "Missing targetLanguage or texts",
      });
    }

    const languageLabel =
    LANGUAGE_NAMES[String(targetLanguage).toLowerCase()] || targetLanguage;

    // Numbered list generation for better LLM precision
    const numbered = items
    .map((item, i) => `${i + 1}. ${item}`)
    .join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `You are translating KrishiSarthi UI strings for Indian farmers.
      Translate each numbered string into ${languageLabel} (${targetLanguage}).
      Keep proper nouns, crop names, currency symbols, numbers, and HTML tags unchanged.
      Return translations in the same order and length as the input list.

      Input:
      ${numbered}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["translations"],
        },
      },
    });

    let parsed = { translations: [] };
    try {
      parsed = JSON.parse(String(response.text || "").trim());
    } catch (err) {
      console.error("Translate JSON parse error:", err);
    }

    let translations = Array.isArray(parsed?.translations)
    ? parsed.translations.map((t) => String(t ?? ""))
    : [];

    // Fallback: If length mismatches, merge translated ones with originals
    if (translations.length !== items.length) {
      translations = items.map((original, i) => translations[i] || original);
    }

    res.json({
      translations,
      translatedText: translations[0] || "",
    });
  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: "Failed to translate text" });
  }
});

export default router;
