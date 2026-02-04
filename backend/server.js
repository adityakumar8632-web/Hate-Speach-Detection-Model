const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// CONFIG
const PORT = process.env.PORT || 3000;

// HEALTH CHECK ROUTE
app.get("/", (req, res) => {
  res.send("AI Moderation Backend is running 🚀");
});

// ANALYZE TEXT ROUTE
app.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body;

    // Input validation
    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: "Valid text input is required"
      });
    }

    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Server configuration error (API key missing)"
      });
    }

    // Call OpenAI Moderation API
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: text
      })
    });

    // Handle API-level errors
    if (!response.ok) {
      console.error("OpenAI API error:", response.status);
      return res.status(502).json({
        error: "OpenAI moderation service failed"
      });
    }

    const data = await response.json();

    // Send response to frontend
    res.json(data);

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});