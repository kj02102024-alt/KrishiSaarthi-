/**
 * KrishiSarthi TranslationManager
 * Scans [data-i18n] nodes, caches by language + original English,
 * and batches uncached strings to POST /api/translate.
 */
(function () {
  const TranslationManager = {
    currentLang: "en",
    inFlight: false,

    cacheKey(targetLang, originalText) {
      return `ks_i18n:${targetLang}:${originalText}`;
    },

    readCache(targetLang, originalText) {
      try {
        return localStorage.getItem(this.cacheKey(targetLang, originalText));
      } catch (error) {
        console.warn("[KrishiTranslator] cache read failed:", error);
        return null;
      }
    },

    writeCache(targetLang, originalText, translated) {
      try {
        localStorage.setItem(this.cacheKey(targetLang, originalText), translated);
      } catch (error) {
        console.warn("[KrishiTranslator] cache write failed:", error);
      }
    },

    langSelects() {
      return ["lang-select", "header-lang-select", "language-select"]
        .map((id) => document.getElementById(id))
        .filter(Boolean);
    },

    captureOriginal(el) {
      if (!el.hasAttribute("data-original-text")) {
        el.setAttribute("data-original-text", (el.innerText || "").trim());
      }
      return el.getAttribute("data-original-text") || "";
    },

    capturePlaceholder(el) {
      if (!el.hasAttribute("data-original-placeholder")) {
        el.setAttribute("data-original-placeholder", el.getAttribute("placeholder") || "");
      }
      return el.getAttribute("data-original-placeholder") || "";
    },

    scanNodes() {
      return Array.from(document.querySelectorAll("[data-i18n]"));
    },

    scanPlaceholders() {
      return Array.from(document.querySelectorAll("[data-i18n-placeholder]"));
    },

    restoreEnglish() {
      this.scanNodes().forEach((el) => {
        const original = this.captureOriginal(el);
        if (original) el.innerText = original;
      });
      this.scanPlaceholders().forEach((el) => {
        const original = this.capturePlaceholder(el);
        if (original) el.setAttribute("placeholder", original);
      });
    },

    syncSelects(targetLang) {
      this.langSelects().forEach((select) => {
        if (select.value !== targetLang) select.value = targetLang;
      });
    },

    async setLanguage(lang) {
      const targetLang = String(lang || "en").toLowerCase();
      this.currentLang = targetLang;
      if (typeof currentLang !== "undefined") currentLang = targetLang;
      this.syncSelects(targetLang);

      const nodes = this.scanNodes();
      const placeholders = this.scanPlaceholders();
      nodes.forEach((el) => this.captureOriginal(el));
      placeholders.forEach((el) => this.capturePlaceholder(el));

      if (targetLang === "en") {
        this.restoreEnglish();
        return;
      }

      const jobs = [];
      nodes.forEach((el, i) => {
        const originalText = this.captureOriginal(el);
        if (!originalText) return;
        const cached = this.readCache(targetLang, originalText);
        if (cached != null) {
          el.innerText = cached;
        } else {
          jobs.push({ kind: "text", el, originalText, index: i });
        }
      });
      placeholders.forEach((el) => {
        const originalText = this.capturePlaceholder(el);
        if (!originalText) return;
        const cached = this.readCache(targetLang, originalText);
        if (cached != null) {
          el.setAttribute("placeholder", cached);
        } else {
          jobs.push({ kind: "placeholder", el, originalText });
        }
      });

      if (!jobs.length) return;

      this.inFlight = true;
      try {
        const missingTexts = jobs.map((job) => job.originalText);
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetLanguage: targetLang,
            texts: missingTexts,
          }),
        });
        const data = await res.json();
        const translations = Array.isArray(data.translations)
          ? data.translations
          : data.translatedText
          ? [data.translatedText]
          : [];

        jobs.forEach((job, batchIndex) => {
          const translated = translations[batchIndex] || job.originalText;
          this.writeCache(targetLang, job.originalText, translated);
          if (job.kind === "placeholder") {
            job.el.setAttribute("placeholder", translated);
          } else {
            job.el.innerText = translated;
          }
        });
      } catch (err) {
        console.error("[KrishiTranslator] batch failed:", err);
      } finally {
        this.inFlight = false;
      }
    },
  };

  window.TranslationManager = TranslationManager;
  window.KrishiTranslator = TranslationManager;

  function boot() {
    TranslationManager.scanNodes().forEach((el) => TranslationManager.captureOriginal(el));
    TranslationManager.scanPlaceholders().forEach((el) => TranslationManager.capturePlaceholder(el));

    TranslationManager.langSelects().forEach((select) => {
      select.addEventListener("change", () => {
        TranslationManager.setLanguage(select.value);
      });
    });

    const initial =
      (document.getElementById("header-lang-select") && document.getElementById("header-lang-select").value) ||
      (document.getElementById("lang-select") && document.getElementById("lang-select").value) ||
      "en";
    TranslationManager.currentLang = initial;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
