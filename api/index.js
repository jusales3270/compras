import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import pdfParse from "pdf-parse";

dotenv.config();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.get("/api/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "Express + Gemini + Multer + pdfParse is running", 
    hasKey: !!process.env.GEMINI_API_KEY 
  });
});

export default app;
