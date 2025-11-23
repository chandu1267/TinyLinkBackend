const mongoose = require("mongoose");

const linkSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  targetUrl: { type: String, required: true },
  totalClicks: { type: Number, default: 0 },
  lastClicked: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Link", linkSchema);
