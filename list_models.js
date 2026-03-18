import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    fs.writeFileSync("models_output.txt", "No API key found in .env");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

async function run() {
    try {
        const result = await client.models.list();
        let output = "Found models:\n";
        
        let modelsArray = [];
        if (result.pageInternal) {
            modelsArray = result.pageInternal;
        } else if (result.models) {
            modelsArray = result.models;
        }
        
        if (modelsArray.length > 0) {
            modelsArray.forEach(m => {
                output += `- ${m.name}\n`;
            });
        } else {
            output += "No models found in expected properties.\n";
            output += "Raw keys: " + Object.keys(result).join(", ");
        }
        
        fs.writeFileSync("models_output.txt", output);
    } catch (e) {
        fs.writeFileSync("models_output.txt", "Error: " + e.message);
    }
}

run();
