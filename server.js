require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = 51463;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/mission", async (req, res) => {
  const objective = req.body.objective || "";
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat";

  console.log("MISSION:", objective);

  if (!apiKey) {
    return res.json({
      success: true,
      reply: `Jarvis fallback: API key yok ama görevi aldım: ${objective}`
    });
  }

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model,
        messages: [
          {
            role: "system",
            content: "Sen Jarvis Core v0.1'sin. Türkçe, kısa ve operasyon odaklı cevap ver."
          },
          {
            role: "user",
            content: objective
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:51463",
          "X-Title": "AgentOS"
        }
      }
    );

    const reply =
      response.data?.choices?.[0]?.message?.content ||
      "Jarvis cevap üretti ama içerik boş döndü.";

    return res.json({
      success: true,
      reply
    });

  } catch (error) {
    console.error("OPENROUTER ERROR:", error.response?.data || error.message);

    return res.json({
      success: true,
      reply: `Jarvis fallback: DeepSeek şu an cevap veremedi ama görev alındı: ${objective}`
    });
  }
});

app.listen(PORT, () => {
  console.log(`AgentOS running on http://localhost:${PORT}`);
});