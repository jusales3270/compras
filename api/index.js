import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

app.get("/api/health", (req, res) => {
    res.json({ 
        success: true, 
        message: "Backend is running (Static Import Fix)", 
        hasKey: !!process.env.GEMINI_API_KEY,
        node: process.version
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

        if (!genAI) {
            genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        }

        // 1. Extract text from PDF
        let fileText = "";
        if (req.file.mimetype === "application/pdf") {
            try {
                // Using the top-level imported pdfParse
                const result = await pdfParse(req.file.buffer);
                fileText = result.text;
            } catch (pdfError) {
                console.error("PDF Parsing Error:", pdfError);
                return res.status(500).json({ success: false, message: "Erro ao processar PDF: " + pdfError.message });
            }
        } else {
            fileText = req.file.buffer.toString("utf8");
        }

        if (!fileText || fileText.trim().length === 0) {
            return res.status(400).json({ success: false, reason: "NO_TEXT", message: "Não foi possível extrair texto do documento." });
        }

        const checklist = JSON.parse(req.body.checklist || "{}");
        const checklistItems = checklist.sections?.map(s => s.items).flat() || [];

        const prompt = `Você é um assistente especialista em licitações e contratos públicos (Fase Interna - Lei 14.133/21).
Sua missão é ler o documento abaixo e verificar se ele atende aos itens do checklist solicitado.

=== DOCUMENTO DE REFERÊNCIA ===
${fileText.substring(0, 30000)}

=== CHECKLIST ===
${checklistItems.map((item, idx) => `${idx}: ${item}`).join("\n")}

Responda SOMENTE em JSON puro:
{
  "newChecked": { "índice": true_ou_false },
  "annotations": { "índice": { "found": bool, "confidence": "alta", "evidence": "...", "observation": "..." } },
  "summary": "...",
  "missingCritical": [],
  "recommendations": []
}`;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.1-flash-lite-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(prompt);
        const resultRaw = result.response.text();

        let resultJson;
        try {
            resultJson = JSON.parse(resultRaw);
        } catch (e) {
            const cleaned = resultRaw.replace(/```json/g, "").replace(/```/g, "").trim();
            resultJson = JSON.parse(cleaned);
        }

        return res.json({ success: true, data: resultJson });

    } catch (error) {
        console.error("Erro na análise:", error);
        return res.status(500).json({ success: false, reason: "SERVER_ERROR", message: "Erro na IA: " + error.message });
    }
});

export default app;
