const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Detect AI provider
function detectProvider() {
  const explicit = (process.env.AI_PROVIDER || "").toLowerCase();

  if (explicit) return explicit;

  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";

  return null;
}

// Prompt
const EXTRACTION_PROMPT = `
You are an OCR and manufacturing document extraction AI.

Analyze the uploaded document carefully.

Return ONLY valid raw JSON.

Do NOT:
- add markdown
- add explanation
- add comments
- wrap inside \`\`\`

Return format:

{
  "date": "YYYY-MM-DD or null",
  "shift": "string or null",
  "employee_number": "string or null",
  "operator_name": "string or null",
  "operation_code": "string or null",
  "machine_number": "string or null",
  "work_order_number": "string or null",
  "product_code": "string or null",
  "quantity_produced": number or null,
  "time_taken": number or null,
  "notes": "string or null"
}
`;

// Strong JSON parser
function parseJSON(text) {
  try {
    // Remove markdown wrappers
    let clean = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Find first JSON object
    const firstBrace = clean.indexOf("{");

    if (firstBrace === -1) {
      throw new Error("No JSON object found");
    }

    let braceCount = 0;
    let endIndex = -1;

    for (let i = firstBrace; i < clean.length; i++) {
      if (clean[i] === "{") braceCount++;
      if (clean[i] === "}") braceCount--;

      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) {
      throw new Error("Incomplete JSON object");
    }

    const jsonString = clean.slice(firstBrace, endIndex + 1);

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("JSON Parse Error:", error);
    console.log("RAW AI RESPONSE:\n", text);

    throw new Error(`Invalid AI JSON response: ${error.message}`);
  }
}

// Anthropic
async function extractWithAnthropic(filePath, fileType) {
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    throw new Error("ANTHROPIC_API_KEY missing");
  }

  const fileData = fs.readFileSync(filePath);

  const base64 = fileData.toString("base64");

  let content;

  if (fileType === "application/pdf" || filePath.endsWith(".pdf")) {
    content = [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      },
      {
        type: "text",
        text: EXTRACTION_PROMPT,
      },
    ];
  } else {
    const ext = path.extname(filePath).toLowerCase();

    const mimeType =
      {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
      }[ext] || "image/jpeg";

    content = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType,
          data: base64,
        },
      },
      {
        type: "text",
        text: EXTRACTION_PROMPT,
      },
    ];
  }

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-opus-4-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content,
        },
      ],
    },
    {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
    },
  );

  return parseJSON(response.data.content[0].text);
}

// Gemini
async function extractWithGemini(filePath, fileType) {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("GEMINI_API_KEY missing");
  }

  const { GoogleGenerativeAI } = require("@google/generative-ai");

  const genAI = new GoogleGenerativeAI(key);

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const fileData = fs.readFileSync(filePath);

  const base64 = fileData.toString("base64");

  const isPDF = fileType === "application/pdf" || filePath.endsWith(".pdf");

  const ext = path.extname(filePath).toLowerCase();

  const mimeType = isPDF
    ? "application/pdf"
    : {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
      }[ext] || "image/jpeg";

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64,
      },
    },
    EXTRACTION_PROMPT,
  ]);

  return parseJSON(result.response.text());
}

// Groq
async function extractWithGroq(filePath, fileType) {
  const key = process.env.GROQ_API_KEY;

  if (!key) {
    throw new Error("GROQ_API_KEY missing");
  }

  const isPDF = fileType === "application/pdf" || filePath.endsWith(".pdf");

  if (isPDF) {
    throw new Error("Groq does not support PDFs. Use images or Gemini.");
  }

  const Groq = require("groq-sdk");

  const groq = new Groq({
    apiKey: key,
  });

  const fileData = fs.readFileSync(filePath);

  const base64 = fileData.toString("base64");

  const ext = path.extname(filePath).toLowerCase();

  const mimeType =
    {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    }[ext] || "image/jpeg";

  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",

    max_tokens: 2000,

    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64}`,
            },
          },
          {
            type: "text",
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  const content = response.choices[0].message.content;

  return parseJSON(content);
}

// Main extraction
async function extractDataFromDocument(filePath, fileType) {
  const provider = detectProvider();

  if (!provider) {
    throw new Error("No AI provider configured");
  }

  console.log(`[AI Extraction] Provider: ${provider.toUpperCase()}`);

  switch (provider) {
    case "anthropic":
      return await extractWithAnthropic(filePath, fileType);

    case "gemini":
      return await extractWithGemini(filePath, fileType);

    case "groq":
      return await extractWithGroq(filePath, fileType);

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Provider info
function getProviderInfo() {
  const provider = detectProvider();

  return {
    provider: provider || "none",

    configured: !!provider,

    supportsPDF: provider === "anthropic" || provider === "gemini",

    model:
      {
        anthropic: "claude-opus-4-5",
        gemini: "gemini-1.5-flash",
        groq: "meta-llama/llama-4-scout-17b-16e-instruct",
      }[provider] || "N/A",
  };
}

module.exports = {
  extractDataFromDocument,
  getProviderInfo,
  detectProvider,
};
