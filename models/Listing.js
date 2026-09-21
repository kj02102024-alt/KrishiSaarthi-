import mongoose from "mongoose";
const listingSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },
    qty: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    location: { type: String, required: true, trim: true },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    phone: { type: String, required: true, index: true },
    farmerName: { type: String, default: "Farmer" },
    source: { type: String, default: "whatsapp" },
    rawMessage: { type: String, default: "" },
  },
  { timestamps: true }
);
export default mongoose.model("Listing", listingSchema);
