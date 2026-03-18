import express from "express";
const app = express();

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Minimal express is running on Vercel" });
});

app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "Minimal express test route" });
});

export default app;
