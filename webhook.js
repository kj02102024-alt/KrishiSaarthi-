import { Router } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { downloadMedia, sendTextMessage } from "../services/whatsappService.js";
import { extractListingFromText, transcribeAudio } from "../services/geminiService.js";
import User from "../models/User.js";
import Listing from "../models/Listing.js";

dotenv.config();

const router = Router();
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * Parse Gemini extractListingFromText output into an object.
 * The service returns a string (possibly wrapped in markdown).
 */
function parseListingJson(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;

  const cleaned = String(raw)
  .replace(/```json/gi, "")
  .replace(/```/g, "")
  .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return {
      item: String(parsed.item || "").trim(),
      qty: String(parsed.qty || "").trim(),
      price: Number(parsed.price) || 0,
      location: String(parsed.location || "").trim(),
    };
  } catch (error) {
    console.error("Listing JSON parse error:", error);
    return null;
  }
}

function last10Digits(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function isCompleteListing(listing) {
  return (
    listing &&
    listing.item &&
    listing.qty &&
    listing.location &&
    Number(listing.price) > 0
  );
}

async function findOrCreateFarmer(whatsappId, profileName) {
  const phone = last10Digits(whatsappId);
  if (!phone) throw new Error("Missing WhatsApp phone number");

  let user = await User.findOne({
    $or: [{ phone }, { whatsappId: String(whatsappId) }],
  });

  if (!user) {
    user = await User.create({
      phone,
      whatsappId: String(whatsappId),
                             name: profileName || "Farmer",
                             role: "Farmer",
                             source: "whatsapp",
    });
  } else {
    if (!user.whatsappId) user.whatsappId = String(whatsappId);
    if (profileName && user.name === "Farmer") user.name = profileName;
    await user.save();
  }

  return user;
}

async function processIncomingMessage(message, contact) {
  const from = message.from;
  const senderName = contact?.profile?.name || "Farmer";
  const messageType = message.type;

  if (mongoose.connection.readyState !== 1) {
    await sendTextMessage(
      from,
      "KrishiSarthi is still connecting to the database. Please try again in a moment."
    );
    return;
  }

  const farmer = await findOrCreateFarmer(from, senderName);

  let extractedText = "";

  if (messageType === "text") {
    extractedText = message.text?.body || "";
  } else if (messageType === "audio") {
    const mediaId = message.audio?.id;
    const mimeType = message.audio?.mime_type || "audio/ogg";

    if (!mediaId) {
      await sendTextMessage(from, "Could not read that voice note. Please send it again.");
      return;
    }

    await sendTextMessage(from, "Voice note received. Processing your listing...");

    try {
      const { buffer, mimeType: downloadedMime } = await downloadMedia(mediaId);
      extractedText = await transcribeAudio(buffer, downloadedMime || mimeType);
    } catch (err) {
      console.error("WhatsApp audio / Gemini transcribe error:", err);
      await sendTextMessage(from, "Could not process that voice note right now. Please send a text listing instead.");
      return;
    }
  } else {
    await sendTextMessage(
      from,
      "Please send a text message or voice note describing your produce (item, quantity, price, location)."
    );
    return;
  }

  if (!String(extractedText).trim()) {
    await sendTextMessage(from, "Could not understand the message. Please try again.");
    return;
  }

  let listing;
  try {
    const raw = await extractListingFromText(extractedText);
    listing = parseListingJson(raw);
  } catch (err) {
    console.error("Gemini extract error:", err);
    await sendTextMessage(
      from,
      "Could not parse your listing right now. Please send item, quantity, price, and location again."
    );
    return;
  }

  if (!isCompleteListing(listing)) {
    await sendTextMessage(
      from,
      'Could not extract listing details. Please include item, quantity, price, and location.\nExample: "50kg potatoes for 1000 rupees in Sitapur"'
    );
    return;
  }

  await Listing.create({
    item: listing.item,
    qty: listing.qty,
    price: Number(listing.price),
                       location: listing.location,
                       farmerId: farmer._id,
                       phone: farmer.phone,
                       farmerName: farmer.name,
                       source: "whatsapp",
                       rawMessage: extractedText,
  });

  await sendTextMessage(
    from,
    `✅ Listing published on KrishiSarthi!\n\n🌾 ${listing.item}\n📦 ${listing.qty}\n💰 ₹${listing.price}\n📍 ${listing.location}\n\nIt is now live on the Local Market under your WhatsApp number.`
  );
}

// Meta webhook verification (hub.mode, hub.verify_token, hub.challenge)
router.get(["/webhook", "/webhook/whatsapp"], (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("WhatsApp GET /webhook verification:", { mode, tokenPresent: Boolean(token) });

  if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    console.log("WhatsApp webhook verified — returning hub.challenge");
    return res.status(200).send(challenge);
  }

  console.warn("WhatsApp webhook verification failed");
  return res.sendStatus(403);
});

async function handleIncomingPayload(body) {
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  if (!entries.length) {
    console.log("WhatsApp payload has no entry array.");
    return;
  }

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value || {};
      const messages = Array.isArray(value.messages) ? value.messages : [];
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];

      if (!messages.length) {
        console.log("WhatsApp change has no inbound messages (status update).");
        continue;
      }

      for (const message of messages) {
        const contact =
          contacts.find((c) => c.wa_id === message.from) || contacts[0];
        if (!message?.from) continue;

        try {
          await processIncomingMessage(message, contact);
        } catch (err) {
          console.error("WhatsApp geminiService / auto-reply error:", err);
          try {
            await sendTextMessage(
              message.from,
              "KrishiSarthi is busy right now. Please send your listing again in a moment."
            );
          } catch (sendErr) {
            console.error("Failed to send WhatsApp fallback reply:", sendErr);
          }
        }
      }
    }
  }
}

function ackMeta(res) {
  if (!res.headersSent) {
    res.status(200).send("EVENT_RECEIVED");
  }
}

// Incoming WhatsApp messages — ACK 200 immediately, then process in the background
router.post(["/webhook", "/webhook/whatsapp"], (req, res) => {
  console.log("Incoming WhatsApp POST /webhook payload:");
  console.log(JSON.stringify(req.body || {}, null, 2));

  ackMeta(res);

  const payload = req.body || {};
  setImmediate(() => {
    handleIncomingPayload(payload).catch((err) => {
      console.error("Webhook background processing error:", err);
    });
  });
});

export default router;
