import { Router } from "express";
import { chatWithAssistant } from "../services/geminiService.js";

const router = Router();

// Proxy endpoint so the frontend chatbot never exposes the Gemini API key
router.post("/chat", async (req, res) => {
  try {
    const { message, language } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const reply = await chatWithAssistant(message, language);
    if (!reply) {
      return res.status(502).json({ error: "Empty AI response" });
    }
    return res.json({ reply });
  } catch (err) {
    console.error("Chat proxy error:", err);
    return res.status(500).json({
      error: "Failed to get AI response",
      detail: err?.message || "unknown",
    });
  }
});

export default router;
