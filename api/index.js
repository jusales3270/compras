import express from "express";
import cors from "cors";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParseObj = require("pdf-parse");
const pdfParse = pdfParseObj.PDFParse || pdfParseObj;
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Set up multer for file uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

// AI client will be initialized per-request to handle missing env vars gracefully
let ai = null;
if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} else {
    console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables.");
}

function formatAIError(error) {
    const errorStr = String(error.message || "");
    if (errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED")) {
        return "Cota de API excedida ou muitas requisições por minuto. Por favor, aguarde alguns instantes ou verifique seu plano no Google AI Studio.";
    }
    if (errorStr.includes("404") || errorStr.includes("NOT_FOUND")) {
        return "Modelo de IA não encontrado. Verifique se o modelo configurado no backend está correto.";
    }
    if (errorStr.includes("401") || errorStr.includes("API_KEY_INVALID")) {
        return "Chave de API inválida. Verifique o arquivo .env no backend.";
    }
    try {
        const parsed = JSON.parse(errorStr);
        if (parsed.error && parsed.error.message) return parsed.error.message;
    } catch (e) {}
    return "Erro na análise da IA: " + error.message;
}

app.get("/api/health", (req, res) => {
    res.json({ 
        success: true, 
        message: "Backend is running", 
        env: process.env.NODE_ENV,
        hasKey: !!process.env.GEMINI_API_KEY
    });
});

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
            const parser = new pdfParse({ data: req.file.buffer });
            const result = await parser.getText();
            fileText = result.text;
            await parser.destroy();
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
${checklistItems.map((item, idx) => `${idx}: ${item}`).join("\n")}

Responda SOMENTE em formato JSON puro, sem formatação Markdown (\`\`\`json), com a seguinte estrutura:
{
  "newChecked": { "índice_numérico_do_item": true_ou_false },
  "annotations": { 
      "índice_numérico_do_item": {
         "found": true_ou_false,
         "confidence": "alta" | "media" | "baixa",
         "evidence": "Trecho exato do documento que comprova o item",
         "observation": "Sua explicação ou justificativa da análise"
      }
  },
  "summary": "Resumo geral da análise em 2 frases",
  "missingCritical": ["Lista de itens essenciais que faltaram completamente do documento"],
  "recommendations": ["Ações sugeridas para o responsável do processo"]
}`;

        // 4. Call Gemini API
        if (!ai) {
             // Try to initialize if it wasn't (double check)
             if (process.env.GEMINI_API_KEY) {
                 ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
             } else {
                 return res.status(500).json({ success: false, reason: "AI_NOT_CONFIGURED", message: "Chave de API do Gemini não encontrada nas variáveis de ambiente." });
             }
        }

        const response = await ai.models.generateContent({
            model: "models/gemini-3.1-flash-lite-preview",
            contents: prompt,
            config: {
                temperature: 0.1, // Keep it highly deterministic
                responseMimeType: "application/json"
            }
        });

        const resultRaw = response.candidates[0].content.parts[0].text;

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
        return res.status(500).json({ success: false, reason: "SERVER_ERROR", message: formatAIError(error) });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("CRITICAL BACKEND ERROR:", err);
    res.status(500).json({ success: false, message: "Erro interno no servidor: " + err.message });
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`Backend de IA rodando em http://localhost:${PORT}`);
    });
}

export default app;
