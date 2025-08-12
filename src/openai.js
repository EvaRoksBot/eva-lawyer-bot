import OpenAI from "openai";
import { PROMPTS } from "./prompts/legal.js";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function legalAssist(kind, userText) {
  const system = PROMPTS[kind] || "Ты — опытный юрист.";
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userText }
    ]
  });
  return resp.choices[0].message.content;
}
