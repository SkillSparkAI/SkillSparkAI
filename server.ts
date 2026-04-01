import "dotenv/config";
import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";

console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
console.log("API_KEY exists:", !!process.env.API_KEY);

const courseSchema: any = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The title of the course" },
    description: { type: Type.STRING, description: "A short, engaging description of what the user will learn" },
    modules: {
      type: Type.ARRAY,
      description: "A list of 3 to 5 learning modules",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "A unique identifier for the module (e.g., 'mod-1')" },
          title: { type: Type.STRING, description: "The title of the module" },
          content: { type: Type.STRING, description: "The educational content of the module. Write 4-6 detailed paragraphs explaining the concept clearly and comprehensively, providing examples as if teaching a beginner." },
          quiz: {
            type: Type.OBJECT,
            description: "A multiple-choice question to test the user's understanding of this module's content.",
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Exactly 4 options for the multiple choice question."
              },
              correctAnswerIndex: { type: Type.INTEGER, description: "The index (0-3) of the correct option in the options array." },
              explanation: { type: Type.STRING, description: "A brief explanation of why the answer is correct." }
            },
            required: ["question", "options", "correctAnswerIndex", "explanation"]
          }
        },
        required: ["id", "title", "content", "quiz"]
      }
    }
  },
  required: ["title", "description", "modules"]
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post(["/api/generate-course", "/api/generate-course/"], async (req, res) => {
    try {
      const { topic, language = 'English' } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      console.log("Generating course for topic:", topic);
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        console.error("API Key is missing in the environment");
        return res.status(500).json({ error: "Server configuration error: API Key missing" });
      }

      const aiClient = new GoogleGenAI({ apiKey: apiKey });

      const response = await aiClient.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Create a comprehensive beginner-friendly micro-learning course about: "${topic}". The course should have 4 to 6 logical modules. The ENTIRE course content (description, modules, questions, options, and explanations) MUST be written in ${language} language. HOWEVER, the \`title\` of the course MUST ALWAYS be in English, regardless of the selected language. Make the content engaging, detailed, and practical.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: courseSchema,
          temperature: 0.7,
        },
      });

      if (!response.text) {
        throw new Error("Failed to generate course content.");
      }

      let text = response.text;
      if (text.startsWith('```json')) {
        text = text.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const courseData = JSON.parse(text);
      res.json(courseData);
    } catch (error: any) {
      console.error("Error generating course:", error);
      
      // Handle specific API errors
      if (error.status === 403 || error.message?.includes("insufficient authentication scopes") || error.message?.includes("PERMISSION_DENIED")) {
        return res.status(403).json({ 
          error: "API Key permission denied. The provided API key does not have the necessary scopes or access to the Gemini API. Please check your API key configuration." 
        });
      }
      
      res.status(500).json({ error: error.message || "Failed to generate course" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
