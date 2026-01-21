import { Injectable, inject } from '@angular/core';
import { GoogleGenAI } from "@google/genai";
import { DataService, ChatMessage } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private dataService = inject(DataService);
  private genAI: GoogleGenAI;

  constructor() {
    // API KEY retrieval per guidelines
    this.genAI = new GoogleGenAI({ apiKey: process.env['API_KEY']! });
  }

  async sendMessage(history: ChatMessage[], newMessage: string): Promise<string> {
    try {
      // Construct context
      const systemPrompt = `
        你是一位专业的建筑学导师，服务于"Bauhaus Archipedia"应用。
        你的目标是帮助用户学习建筑知识，制定学习计划，并解释专业术语。
        请用中文回答，语言专业、精确、简洁。
        
        重要规则：
        如果你的回复中提到了任何特定的建筑术语（特别是数据库中已有的），请尽量使用标准术语。
        不要使用Markdown链接语法，直接输出文本即可。
        保持语气鼓励和学术性。
      `;

      // Use the last 10 messages for context window efficiency
      const recentHistory = history.slice(-10);
      
      // FIX: Use structured contents array for multi-turn conversation with generateContent
      const contents = recentHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));
      contents.push({ role: 'user', parts: [{ text: newMessage }] });

      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
        }
      });

      return response.text || "抱歉，我暂时无法回答这个问题。";

    } catch (e) {
      console.error("Gemini Error:", e);
      return "AI连接失败，请检查网络或稍后再试。";
    }
  }
}
