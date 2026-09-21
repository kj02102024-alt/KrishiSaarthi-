import dotenv from "dotenv";

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_BASE = "https://graph.facebook.com/v20.0";

export async function downloadMedia(mediaId) {
  const metaRes = await fetch(`${API_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
  });

  if (!metaRes.ok) {
    throw new Error(`Failed to fetch media metadata: ${metaRes.status}`);
  }

  const meta = await metaRes.json();
  const downloadUrl = meta.url;
  const mimeType = meta.mime_type || "audio/ogg";

  const fileRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
  });

  if (!fileRes.ok) {
    throw new Error(`Failed to download media file: ${fileRes.status}`);
  }

  const arrayBuffer = await fileRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return { buffer, mimeType };
}

export async function sendTextMessage(to, body) {
  const res = await fetch(`${API_BASE}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    console.error("WhatsApp send error:", await res.text());
  }
}
