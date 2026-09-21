/**
 * Firebase Phone Auth with invisible reCAPTCHA (E.164 +91 default).
 */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBNRIt2U6t5m7hQdOhf86eTEhaRmZnP_dg",
  authDomain: "krishisarthi-341d1.firebaseapp.com",
  projectId: "krishisarthi-341d1",
  storageBucket: "krishisarthi-341d1.firebasestorage.app",
  messagingSenderId: "513338973625",
  appId: "1:513338973625:web:f35e1db41645a37bf72a68",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.useDeviceLanguage();
window.auth = auth;
window.confirmationResult = window.confirmationResult || null;

function toast(message, type) {
  if (typeof showToast === "function") showToast(message, type);
  else console.log(`[auth ${type}]`, message);
}

export function toE164(raw, defaultCountry = "91") {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (String(raw).trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+${defaultCountry}${digits}`;
  if (digits.length === 12 && digits.startsWith(defaultCountry)) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return `+${defaultCountry}${digits}`;
}

function resetGrecaptcha() {
  try {
    if (window.grecaptcha && typeof window.grecaptcha.reset === "function") {
      const widgetId = window.recaptchaWidgetId;
      if (widgetId != null) window.grecaptcha.reset(widgetId);
      else window.grecaptcha.reset();
    }
  } catch (err) {
    console.warn("[KrishiAuth] grecaptcha.reset failed:", err);
  }
}

async function ensureRecaptcha() {
  const container = document.getElementById("recaptcha-container");
  if (!container) {
    throw new Error("Missing #recaptcha-container in the DOM");
  }

  if (window.recaptchaVerifier) {
    return window.recaptchaVerifier;
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible",
    callback: () => {
      console.info("[KrishiAuth] reCAPTCHA solved");
    },
    "expired-callback": () => {
      console.warn("[KrishiAuth] reCAPTCHA expired — resetting widget");
      resetGrecaptcha();
    },
  });

  window.recaptchaWidgetId = await window.recaptchaVerifier.render();
  return window.recaptchaVerifier;
}

function clearVerifier() {
  try {
    if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
  } catch (error) {
    console.warn("[KrishiAuth] verifier already cleared:", error);
  }
  window.recaptchaVerifier = null;
  window.recaptchaWidgetId = null;
  const container = document.getElementById("recaptcha-container");
  if (container) container.innerHTML = "";
}

function logDomainHelp(error) {
  const host = window.location.hostname;
  console.group("[KrishiAuth] Firebase Phone Auth setup");
  console.info("Current origin:", window.location.origin);
  console.info("Add this hostname under Firebase Console → Authentication → Settings → Authorized domains:");
  console.info(" ", host);
  console.info("Also keep: localhost, 127.0.0.1");
  console.info("Add test numbers under Authentication → Sign-in method → Phone → Phone numbers for testing.");
  if (error) console.error("Auth error:", error.code, error.message);
  console.groupEnd();
}

function friendlyAuthError(error) {
  const code = error?.code || "";
  if (code === "auth/invalid-phone-number") return "Invalid phone number. Use a 10-digit Indian mobile number.";
  if (code === "auth/too-many-requests") return "Too many OTP attempts. Wait a few minutes or use a Firebase test number.";
  if (code === "auth/quota-exceeded") return "SMS quota exceeded. Add a test phone number in Firebase Console or enable billing.";
  if (code === "auth/captcha-check-failed") return "reCAPTCHA failed. Refresh the page and try again.";
  if (code === "auth/invalid-app-credential" || code === "auth/argument-error") {
    return `Phone Auth is blocked for ${window.location.hostname}. Add this domain in Firebase Authorized domains, then retry.`;
  }
  if (code === "auth/unauthorized-domain") {
    return `Unauthorized domain (${window.location.hostname}). Add it in Firebase Console → Authorized domains.`;
  }
  if (code === "auth/invalid-verification-code") return "Incorrect OTP. Check the 6-digit code and try again.";
  if (code === "auth/code-expired") return "OTP expired. Go back and resend a new code.";
  return error?.message || "OTP request failed";
}

function otpBoxes() {
  return Array.from(document.querySelectorAll(".otp-box, .otp-input"));
}

function collectOtpCode() {
  return otpBoxes().map((i) => i.value).join("");
}

function bindOtpAutoFocus() {
  const boxes = otpBoxes();
  if (!boxes.length || boxes[0].dataset.otpBound === "1") return;

  boxes.forEach((box, index) => {
    box.dataset.otpBound = "1";

    box.addEventListener("input", (e) => {
      const raw = String(e.target.value || "").replace(/\D/g, "");
      if (raw.length > 1) {
        raw.split("").slice(0, boxes.length - index).forEach((digit, offset) => {
          boxes[index + offset].value = digit;
        });
        const nextIndex = Math.min(index + raw.length, boxes.length - 1);
        boxes[nextIndex].focus();
        return;
      }
      e.target.value = raw.slice(-1);
      if (e.target.value && index < boxes.length - 1) {
        boxes[index + 1].focus();
      }
    });

    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && index > 0) {
        boxes[index - 1].focus();
      }
    });
  });
}

function finishLogin(user) {
  if (typeof window.completeKrishiLogin === "function") {
    window.completeKrishiLogin(user);
    return;
  }
  sessionStorage.setItem("ks_user_v2", JSON.stringify(user));
}

export async function sendOTP(phoneNumber) {
  const e164 = toE164(phoneNumber, "91");
  const national = e164.replace(/\D/g, "").slice(-10);

  if (national.length !== 10) {
    throw new Error("Please enter a valid 10-digit Indian mobile number");
  }

  const verifier = await ensureRecaptcha();
  const confirmationResult = await signInWithPhoneNumber(auth, e164, verifier);
  window.confirmationResult = confirmationResult;
  globalThis.confirmationResult = confirmationResult;
  return { e164, confirmationResult };
}

export async function verifyOTP(code) {
  if (!window.confirmationResult) {
    throw new Error("No OTP request found. Send OTP first.");
  }
  const otpCode = String(code || collectOtpCode()).trim();
  const result = await window.confirmationResult.confirm(otpCode);
  return result.user;
}

window.sendOTP = sendOTP;
window.verifyOTP = verifyOTP;
window.toE164 = toE164;

window.handleSendOTP = async function handleSendOTP(e) {
  if (e && typeof e.preventDefault === "function") e.preventDefault();
  const raw = document.getElementById("login-phone")?.value;
  const submitBtn = document.querySelector("#form-login-step1 button[type='submit']");
  if (submitBtn) submitBtn.disabled = true;

  try {
    const { e164 } = await sendOTP(raw);
    const display = document.getElementById("otp-phone-display");
    if (display) display.innerText = e164;
    document.getElementById("form-login-step1")?.classList.add("hidden");
    document.getElementById("form-login-step2")?.classList.remove("hidden");
    bindOtpAutoFocus();
    otpBoxes()[0]?.focus();
    toast("OTP sent to your phone!", "info");
  } catch (error) {
    logDomainHelp(error);
    clearVerifier();
    const code = error?.code || "";
    if (!code && /10-digit/i.test(error?.message || "")) {
      toast(error.message, "error");
    } else {
      toast(friendlyAuthError(error), "error");
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
};

window.handleVerifyOTP = async function handleVerifyOTP(e) {
  if (e && typeof e.preventDefault === "function") e.preventDefault();

  const cleanOtp = collectOtpCode().replace(/\s+/g, "").trim();
  if (cleanOtp.length !== 6) {
    toast("Please enter the full 6-digit OTP", "error");
    return;
  }

  const confirmation = window.confirmationResult || globalThis.confirmationResult;
  if (!confirmation) {
    toast("No OTP request found. Go back and resend.", "error");
    return;
  }

  try {
    const result = await confirmation.confirm(cleanOtp);
    const lang = document.getElementById("lang-select")?.value || "en";
    const user = {
      name: document.getElementById("login-name")?.value || "",
      phone: result.user.phoneNumber || document.getElementById("login-phone")?.value || "",
      role: document.getElementById("login-role")?.value || "",
      lang,
      uid: result.user.uid,
    };
    finishLogin(user);
    toast("Phone verified successfully!", "success");
  } catch (error) {
    console.error("Invalid OTP:", error.code, error.message);
    toast(friendlyAuthError(error), "error");
  }
};

window.resendOTP = async function resendOTP(e) {
  if (e && typeof e.preventDefault === "function") e.preventDefault();
  const fakeEvent = { preventDefault() {} };
  await window.handleSendOTP(fakeEvent);
};

window.backToStep1 = function backToStep1(e) {
  if (e && typeof e.preventDefault === "function") e.preventDefault();
  document.getElementById("form-login-step2")?.classList.add("hidden");
  document.getElementById("form-login-step1")?.classList.remove("hidden");
  otpBoxes().forEach((box) => {
    box.value = "";
  });
  window.confirmationResult = null;
  globalThis.confirmationResult = null;
  clearVerifier();
};

function bindAuthForms() {
  bindOtpAutoFocus();
}

logDomainHelp();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindAuthForms);
} else {
  bindAuthForms();
}
