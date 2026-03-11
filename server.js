import express from "express";
import cors from "cors";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Set up multer for file uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini Client
// Requires GEMINI_API_KEY to be set in .env
const ai = new GoogleGenAI({});

app.post("/api/analyze-document", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, reason: "NO_FILE", message: "Nenhum arquivo enviado." });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ success: false, reason: "AI_NOT_CONFIGURED", message: "Configure a chave de API do Gemini no backend." });
        }

        // 1. Extract text from PDF
        let fileText = "";
        if (req.file.mimetype === "application/pdf") {
            const data = await pdfParse(req.file.buffer);
            fileText = data.text;
        } else {
            // For simplicity, handle basic text files or fallback
            fileText = req.file.buffer.toString("utf8");
        }

        if (!fileText || fileText.trim().length === 0) {
            return res.status(400).json({ success: false, reason: "NO_TEXT", message: "Não foi possível extrair texto do documento." });
        }

        // 2. Parse checklist requirements from request body
        const checklist = JSON.parse(req.body.checklist || "{}");
        const checklistItems = checklist.sections?.map(s => s.items).flat() || [];

        // 3. Construct Gemini Prompt
        const prompt = `Você é um assistente especialista em licitações e contratos públicos (Fase Interna - Lei 14.133/21).
Sua missão é ler o documento abaixo e verificar se ele atende aos itens do checklist solicitado.

=== DOCUMENTO DE REFERÊNCIA ===
${fileText.substring(0, 30000)} // Limiting text to prevent token overflow for massive PDFs

=== CHECKLIST (Verifique estes itens) ===
${checklistItems.map((item, idx) => `- ${item}`).join("\n")}

Responda SOMENTE em formato JSON puro, sem formatação Markdown (\`\`\`json), com a seguinte estrutura:
{
  "newChecked": { "Nome do item do checklist": true_ou_false },
  "annotations": { "Nome do item do checklist": "Breve justificativa/página onde achou" },
  "summary": "Resumo geral da análise em 2 frases",
  "missingCritical": ["Lista de itens essenciais que faltaram completamente do documento"],
  "recommendations": ["Ações sugeridas para o responsável do processo"]
}`;

        // 4. Call Gemini API
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash-8b",
            contents: prompt,
            config: {
                temperature: 0.1, // Keep it highly deterministic
                responseMimeType: "application/json"
            }
        });

        const resultRaw = response.text;

        // Attempt to parse the structured JSON from Gemini
        let resultJson;
        try {
            resultJson = JSON.parse(resultRaw);
        } catch (e) {
            // Strip markdown backticks if Gemini accidentally included them despite instructions
            const cleaned = resultRaw.replace(/```json/g, "").replace(/```/g, "").trim();
            resultJson = JSON.parse(cleaned);
        }

        // 5. Send results to Frontend
        return res.json({
            success: true,
            data: resultJson
        });

    } catch (error) {
        console.error("Erro na análise da IA:", error);
        return res.status(500).json({ success: false, reason: "SERVER_ERROR", message: "Erro interno: " + error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Backend de IA rodando em http://localhost:${PORT}`);
});
