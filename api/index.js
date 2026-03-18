import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

dotenv.config();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.get("/api/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "Express + Gemini + Multer is running", 
    hasKey: !!process.env.GEMINI_API_KEY 
  });
});

app.post("/api/test-upload", upload.single("file"), (req, res) => {
  res.json({ success: true, fileReceived: !!req.file });
});

export default app;
