require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Link = require("./models/Link");

const app = express();

/* ------------ CORS CONFIG ------------- */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://tiny-link-xi.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Postman, etc.
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());

console.log("MONGODB_URI:", process.env.MONGODB_URI);

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ Mongo connection error:");
    console.error(err);
  });

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function generateCode() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  const length = 6;
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Health check
app.get("/healthz", (req, res) => {
  res.status(200).json({ ok: true, version: "1.0" });
});

// Create short link
app.post("/api/links", async (req, res) => {
  try {
    const { targetUrl, code: customCode } = req.body;

    if (!targetUrl || !isValidUrl(targetUrl)) {
      return res.status(400).json({ error: "Invalid URL" });
    }

    let code = customCode || generateCode();

    const existing = await Link.findOne({ code });
    if (existing) {
      return res.status(409).json({ error: "Code already exists" });
    }

    const link = await Link.create({ code, targetUrl });
    res.status(201).json(link);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all links
app.get("/api/links", async (req, res) => {
  try {
    const links = await Link.find().sort({ createdAt: -1 });
    res.json(links);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get single link stats
app.get("/api/links/:code", async (req, res) => {
  try {
    const link = await Link.findOne({ code: req.params.code });
    if (!link) return res.status(404).json({ error: "Not found" });
    res.json(link);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete link
app.delete("/api/links/:code", async (req, res) => {
  try {
    const deleted = await Link.findOneAndDelete({ code: req.params.code });
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Redirect route
app.get("/:code", async (req, res) => {
  try {
    const link = await Link.findOne({ code: req.params.code });
    if (!link) return res.status(404).send("Not found");

    link.totalClicks += 1;
    link.lastClicked = new Date();
    await link.save();

    res.redirect(302, link.targetUrl);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
