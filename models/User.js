import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    // Last 10 digits — matches website login (+91XXXXXXXXXX)
    phone: { type: String, required: true, unique: true, index: true },
    // Full WhatsApp Cloud API wa_id, e.g. 9198XXXXXXXX
    whatsappId: { type: String, index: true },
    name: { type: String, default: "Farmer" },
    role: { type: String, default: "Farmer" },
    source: { type: String, default: "whatsapp" },
  },
  { timestamps: true }
);
export default mongoose.model("User", userSchema);
