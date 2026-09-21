/**
 * KrishiSarthi Web Speech output.
 * Fixes Chromium/Linux SpeechSynthesis GC abort, queue stall, and cold-start voices.
 */
(function () {
  const LANG_MAP = {
    en: "en-IN",
    hi: "hi-IN",
    pb: "pa-IN",
    pa: "pa-IN",
    mr: "mr-IN",
    gu: "gu-IN",
    bn: "bn-IN",
    te: "te-IN",
    ta: "ta-IN",
    kn: "kn-IN",
  };

  let unlocked = false;
  let resumeTimer = null;
  window._krishiUtterances = window._krishiUtterances || [];

  function stripMarkdown(text) {
    return String(text || "")
      .replace(/[*#_`]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function bcp47(lang) {
    const key = String(lang || "en").toLowerCase();
    return LANG_MAP[key] || (key.includes("-") ? key : "en-IN");
  }

  function waitForVoices() {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) {
        resolve([]);
        return;
      }

      const existing = synth.getVoices();
      if (existing && existing.length) {
        resolve(existing);
        return;
      }

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve(synth.getVoices() || []);
      };

      synth.addEventListener("voiceschanged", finish, { once: true });
      window.setTimeout(finish, 1500);
    });
  }

  function pickVoice(voices, langCode) {
    if (!voices.length) return null;
    const prefix = langCode.split("-")[0].toLowerCase();
    return (
      voices.find((v) => v.lang && v.lang.toLowerCase() === langCode.toLowerCase()) ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(prefix + "-")) ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(prefix)) ||
      voices.find((v) => /google/i.test(v.name)) ||
      voices[0]
    );
  }

  function chunkText(text) {
    const parts = String(text)
      .split(/(?<=[.!?।])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return [text];
    const chunks = [];
    let current = "";
    parts.forEach((part) => {
      if ((current + " " + part).trim().length > 180 && current) {
        chunks.push(current.trim());
        current = part;
      } else {
        current = (current + " " + part).trim();
      }
    });
    if (current) chunks.push(current);
    return chunks;
  }

  function stopResumeWatch() {
    if (resumeTimer) {
      window.clearInterval(resumeTimer);
      resumeTimer = null;
    }
  }

  function startResumeWatch() {
    stopResumeWatch();
    resumeTimer = window.setInterval(() => {
      try {
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.resume();
        } else {
          stopResumeWatch();
        }
      } catch (error) {
        console.warn("[KrishiVoice] resume watch failed:", error);
        stopResumeWatch();
      }
    }, 4000);
  }

  function unlock() {
    const synth = window.speechSynthesis;
    if (!synth || unlocked) return;
    try {
      synth.cancel();
      const warm = new SpeechSynthesisUtterance(" ");
      warm.volume = 0;
      warm.rate = 1;
      window._krishiUtterances.push(warm);
      synth.speak(warm);
      unlocked = true;
    } catch (err) {
      console.warn("[KrishiVoice] unlock failed:", err);
    }
  }

  async function speak(text, lang) {
    const synth = window.speechSynthesis;
    if (!synth) {
      console.warn("[KrishiVoice] speechSynthesis is not available");
      return;
    }

    const cleaned = stripMarkdown(text);
    if (!cleaned) return;

    unlock();
    synth.cancel();
    stopResumeWatch();
    window._krishiUtterances = [];

    const voices = await waitForVoices();
    const langCode = bcp47(lang);
    const voice = pickVoice(voices, langCode);
    const chunks = chunkText(cleaned);

    await new Promise((r) => window.setTimeout(r, 80));

    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = langCode;
      utterance.rate = 1;
      utterance.pitch = 1;
      if (voice) utterance.voice = voice;
      window._krishiUtterances.push(utterance);
      window.activeUtterance = utterance;

      utterance.onend = () => {
        if (index === chunks.length - 1) stopResumeWatch();
        if (window.activeUtterance === utterance) window.activeUtterance = null;
      };
      utterance.onerror = (ev) => {
        console.warn("[KrishiVoice] utterance error:", ev.error);
        if (window.activeUtterance === utterance) window.activeUtterance = null;
      };

      synth.speak(utterance);
    });

    startResumeWatch();
    if (synth.paused) {
      try {
        synth.resume();
      } catch (error) {
        console.warn("[KrishiVoice] resume failed:", error);
      }
    }
  }

  window.addEventListener("click", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });

  window.KrishiVoice = { speak, stripMarkdown, bcp47, unlock };
})();
