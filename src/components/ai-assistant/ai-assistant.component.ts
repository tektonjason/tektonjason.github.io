
import { Component, signal, inject } from '@angular/core';
import { DataService } from '../../services/data.service';

interface AiTool {
  id: string;
  name: string;
  url: string;
  desc: string;
  theme: string;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [],
  template: `
    <div class="h-full flex flex-col bg-[#f8f7f5] overflow-y-auto p-6 relative">
      
      <!-- Top Header -->
      <div class="flex items-center gap-4 mb-8 pl-24 transition-all">
        <div class="border-l-8 border-[#1C39BB] pl-4">
          <h2 class="text-3xl md:text-4xl font-black uppercase">AI 导师导航</h2>
        </div>
      </div>

      <p class="text-gray-600 font-bold mb-8 pl-24">请选择一个 AI 模型，复制专属提示词进行提问。</p>

      <!-- Tools Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        @for (tool of aiTools; track tool.id) {
          <div 
            (click)="openModal(tool)"
            class="bauhaus-card p-6 flex flex-col cursor-pointer group hover:bg-white relative overflow-hidden"
          >
            <!-- Decorative corner -->
            <div class="absolute top-0 right-0 w-8 h-8 border-b-2 border-l-2 border-black bg-yellow-300 transition-all group-hover:w-12 group-hover:h-12"></div>

            <div class="flex items-center gap-4 mb-4">
              <!-- Icons -->
              <div class="w-14 h-14 shrink-0 flex items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_0px_black] group-hover:shadow-[4px_4px_0px_0px_black] transition-all">
                @switch (tool.id) {
                  @case ('deepseek') {
                    <svg viewBox="0 0 24 24" class="w-10 h-10" fill="none" stroke="black" stroke-width="2"><circle cx="12" cy="12" r="10" fill="#1C39BB" /><path d="M10 8L16 12L10 16V8Z" fill="white" stroke="white" stroke-width="1"/></svg>
                  }
                  @case ('chatgpt') {
                    <svg viewBox="0 0 24 24" class="w-10 h-10" fill="none" stroke="black" stroke-width="2"><rect x="4" y="4" width="12" height="12" fill="#00A67E" /><rect x="8" y="8" width="12" height="12" fill="white" /></svg>
                  }
                  @case ('gemini') {
                    <svg viewBox="0 0 24 24" class="w-10 h-10" fill="none" stroke="black" stroke-width="2"><path d="M12 2L22 12L12 22L2 12Z" fill="#FFD700" /><path d="M12 6L18 12L12 18L6 12Z" fill="white" /></svg>
                  }
                  @case ('claude') {
                    <svg viewBox="0 0 24 24" class="w-10 h-10" fill="none" stroke="black" stroke-width="2"><rect x="5" y="4" width="14" height="16" fill="#DA552F" /><line x1="9" y1="9" x2="15" y2="9" stroke="white" stroke-width="2"/><line x1="9" y1="13" x2="15" y2="13" stroke="white" stroke-width="2"/></svg>
                  }
                  @case ('grok') {
                    <svg viewBox="0 0 24 24" class="w-10 h-10" fill="none" stroke="black" stroke-width="3"><rect x="2" y="2" width="20" height="20" fill="white" stroke-width="2"/><path d="M7 7L17 17M17 7L7 17" stroke="black" /></svg>
                  }
                  @case ('doubao') {
                    <svg viewBox="0 0 24 24" class="w-10 h-10" fill="none" stroke="black" stroke-width="2"><path d="M2 17C2 11.4772 6.47715 7 12 7C17.5228 7 22 11.4772 22 17H2Z" fill="#1C39BB" /><circle cx="9" cy="14" r="1.5" fill="white" stroke="none"/><circle cx="15" cy="14" r="1.5" fill="white" stroke="none"/></svg>
                  }
                }
              </div>
              <h3 class="text-2xl font-black">{{ tool.name }}</h3>
            </div>
            
            <p class="text-gray-600 mb-6 font-medium leading-relaxed flex-1">{{ tool.desc }}</p>
            
            <button class="bauhaus-btn w-full py-3 bg-white hover:bg-black hover:text-white flex items-center justify-center gap-2">
              <span>获取提示词</span>
              <span class="text-lg">➜</span>
            </button>
          </div>
        }
      </div>

      <!-- Prompt Modal (Same logic) -->
      @if (selectedTool()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div (click)="closeModal()" class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"></div>
          <div class="bg-white border-4 border-black shadow-[8px_8px_0px_0px_black] w-full max-w-2xl max-h-[90vh] flex flex-col relative z-10 animate-[fadeIn_0.2s_ease-out]">
            <div class="bg-black text-white p-4 flex justify-between items-center shrink-0 border-b-4 border-yellow-300">
              <h3 class="text-xl font-bold uppercase tracking-wider">前往: {{ selectedTool()?.name }}</h3>
              <button (click)="closeModal()" class="text-white hover:text-red-500 font-black text-2xl leading-none">&times;</button>
            </div>
            <div class="p-6 overflow-y-auto custom-scrollbar">
              <p class="font-bold mb-4 text-gray-500">已为您准备好建筑学专用提示词 (Prompt):</p>
              <div class="bg-gray-50 border-2 border-black p-6 font-mono text-sm leading-loose whitespace-pre-wrap relative group">
                <span>{{ promptParts.prefix }}</span><span class="text-[#E32636] font-black bg-yellow-200 px-1 py-0.5 mx-1">{{ promptParts.highlight }}</span><span>{{ promptParts.suffix }}</span>
              </div>
              <div class="mt-4 flex gap-3 text-sm text-gray-700 bg-blue-100 p-4 border-2 border-blue-300">
                <span class="text-blue-600 font-bold text-xl leading-none">ℹ️</span>
                <p>点击下方按钮将自动<strong class="font-black">复制</strong>以上内容，并<strong class="font-black">跳转</strong>至 {{ selectedTool()?.name }} 官网。请在聊天框<strong class="font-black">粘贴</strong>并修改红色部分的关键词。</p>
              </div>
            </div>
            <div class="p-6 border-t-4 border-black bg-gray-100 flex gap-4 shrink-0">
              <button (click)="closeModal()" class="flex-1 py-3 border-2 border-black font-bold bg-white hover:bg-gray-200 transition-colors">取消</button>
              <button 
                (click)="copyAndGo()" 
                class="flex-[2] py-3 bg-[#1C39BB] text-white border-2 border-black shadow-[4px_4px_0px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_black] font-bold flex items-center justify-center gap-2 hover:bg-blue-800 transition-all"
              >
                <span>复制并转到网页</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AiAssistantComponent {
  dataService = inject(DataService);
  aiTools: AiTool[] = [
    { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com', desc: '深度求索 (DeepSeek) 是国产开源大模型的领军者，擅长复杂逻辑推理、代码生成及深度学术问答。', theme: 'blue' },
    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', desc: 'OpenAI 开发的通用人工智能，拥有最庞大的知识库和流畅的对话体验，适合广泛的建筑理论探讨。', theme: 'green' },
    { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', desc: 'Google 的原生多模态 AI，能同时处理文本和图片信息，适合结合建筑图像进行分析。', theme: 'blue' },
    { id: 'claude', name: 'Claude', url: 'https://claude.ai', desc: 'Anthropic 开发的 AI，以安全性和长文本处理能力著称，非常适合阅读和总结长篇建筑论文。', theme: 'orange' },
    { id: 'grok', name: 'Grok', url: 'https://grok.x.ai', desc: 'X (Twitter) 旗下的 AI，能够实时获取社交媒体上的最新资讯和趋势，风格犀利幽默。', theme: 'black' },
    { id: 'doubao', name: '豆包', url: 'https://www.doubao.com', desc: '字节跳动推出的智能助手，响应速度快，中文语境理解能力强，适合日常快速查询。', theme: 'blue' }
  ];

  selectedTool = signal<AiTool | null>(null);

  promptParts = {
    prefix: '我正在使用 "Bauhaus Archipedia" 学习建筑学。请你扮演我的专业导师，基于你的知识库，帮我解答关于 ',
    highlight: '【在此处替换你的问题关键词】',
    suffix: ' 的问题。请确保你的回答专业、精确、简洁、有条理，并且主要使用中文。'
  };

  fullPrompt = this.promptParts.prefix + this.promptParts.highlight + this.promptParts.suffix;

  openModal(tool: AiTool) {
    this.selectedTool.set(tool);
    // When opening a modal, ensure sidebar is closed on mobile for better view
    if (window.innerWidth < 768) {
      this.dataService.setSidebarState(false);
    }
  }

  closeModal() {
    this.selectedTool.set(null);
  }

  copyAndGo() {
    const tool = this.selectedTool();
    if (tool) {
      navigator.clipboard.writeText(this.fullPrompt).then(() => {
        window.open(tool.url, '_blank');
        this.closeModal();
      }).catch(err => {
        console.error('Failed to copy text: ', err);
        // Fallback or error message
      });
    }
  }
}