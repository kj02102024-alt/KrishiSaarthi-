import { Router } from "express";
import Listing from "../models/Listing.js";

const router = Router();

// Public listings for the website Local Market
router.get("/listings", async (req, res) => {
  try {
    const listings = await Listing.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
    res.json({ listings });
  } catch (err) {
    console.error("Listings fetch error:", err);
    res.status(500).json({ error: "Failed to load listings", listings: [] });
  }
});

export default router;
