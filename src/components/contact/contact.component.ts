
import { Component } from '@angular/core';

interface DownloadLink {
  name: string;
  url: string;
  icon: string;
  description: string;
  buttonText: string;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  template: `
    <div class="h-full flex flex-col p-6 bg-[#f8f7f5] overflow-y-auto">
      
      <!-- Top Header -->
      <div class="flex items-center gap-4 mb-8 pl-24 transition-all">
        <div class="border-l-8 border-[#1C39BB] pl-4">
          <h2 class="text-3xl md:text-4xl font-black uppercase">关于应用</h2>
          <p class="text-gray-600 font-bold mt-1">About & Contact</p>
        </div>
      </div>

      <!-- Contact Info -->
      <section class="mb-10">
        <h3 class="text-2xl font-bold mb-4 flex items-center gap-3">
          <span class="w-4 h-4 bg-black"></span>
          交流邮箱
        </h3>
        <div class="bauhaus-card p-6 bg-white">
          <p class="text-lg">
            如果您有任何建议、问题或合作意向，请发送邮件至：
            <a href="mailto:tektonjason@163.com" class="font-bold text-[#1C39BB] underline hover:text-red-500 transition-colors">
              tektonjason@163.com
            </a>
          </p>
        </div>
      </section>

      <!-- Online Version Section -->
      <section class="mb-10">
        <h3 class="text-2xl font-bold mb-4 flex items-center gap-3">
          <span class="w-4 h-4 bg-[#E32636]"></span>
          在线使用
        </h3>
        <a [href]="onlineLink.url" target="_blank" class="bauhaus-card p-6 flex flex-col items-center justify-center text-center group hover:bg-white">
          <div class="text-5xl mb-4" [innerHTML]="onlineLink.icon"></div>
          <h4 class="text-xl font-black mb-2">{{ onlineLink.name }}</h4>
          <p class="text-sm text-gray-500 mb-4 min-h-[2.5rem]">{{ onlineLink.description }}</p>
          <div class="mt-auto w-full">
            <div class="bauhaus-btn bg-white w-full py-3 group-hover:bg-[#E32636] group-hover:text-white transition-colors">
              {{ onlineLink.buttonText }}
            </div>
          </div>
        </a>
      </section>

      <!-- Software Updates Section -->
      <section>
        <h3 class="text-2xl font-bold mb-4 flex items-center gap-3">
          <span class="w-4 h-4 bg-black"></span>
          软件更新
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (link of downloadLinks; track link.name) {
            <a [href]="link.url" target="_blank" class="bauhaus-card p-6 flex flex-col items-center justify-center text-center group hover:bg-white">
              <div class="text-5xl mb-4" [innerHTML]="link.icon"></div>
              <h4 class="text-xl font-black mb-2">{{ link.name }}</h4>
              <p class="text-sm text-gray-500 mb-4 min-h-[2.5rem]">{{ link.description }}</p>
              <div class="mt-auto w-full">
                <div class="bauhaus-btn bg-white w-full py-3 group-hover:bg-black group-hover:text-white transition-colors">
                  {{ link.buttonText }}
                </div>
              </div>
            </a>
          }
        </div>
      </section>

      <!-- Sources Section -->
      <section class="mt-10 pb-10">
        <h3 class="text-2xl font-bold mb-4 flex items-center gap-3">
          <span class="w-4 h-4 bg-black"></span>
          文献来源
        </h3>
        <div class="bauhaus-card p-6 bg-white text-gray-700">
          <p class="font-bold mb-4 text-black">本应用中的部分图片素材来源于以下平台或文献，并遵循其许可协议：</p>
          <ul class="list-disc list-inside space-y-3 text-sm leading-relaxed font-serif">
            <li>Wikimedia Commons, 协议 <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.en" target="_blank" rel="noopener noreferrer" class="underline text-blue-600 hover:text-red-500">CC BY-SA 4.0</a></li>
            <li>Openverse, 协议 <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.en" target="_blank" rel="noopener noreferrer" class="underline text-blue-600 hover:text-red-500">CC BY-SA 4.0</a></li>
            <li>Pixabay, 协议 <a href="https://creativecommons.org/public-domain/cc0/" target="_blank" rel="noopener noreferrer" class="underline text-blue-600 hover:text-red-500">CC0</a></li>
            <li>《中国建筑图解词典》（作者：王其钧）</li>
            <li>《西方建筑图解词典》（作者：王其钧）</li>
            <li>《中国建筑史》（主编：潘谷西）</li>
            <li>《外国建筑史》（作者：陈志华）</li>
            <li>《外国近现代建筑史》（主编：罗小未）</li>
            <li><em>Fundamentals of Building Construction: Materials and Methods</em> (作者：Edward Allen & Joseph Iano) Wiley出版社</li>
          </ul>
        </div>
      </section>

    </div>
  `
})
export class ContactComponent {
  onlineLink: DownloadLink;
  downloadLinks: DownloadLink[];

  constructor() {
    this.onlineLink = { 
      name: '在线版本', 
      url: 'https://archipediaonline.netlify.app',
      description: '可在线浏览，也可下载为电脑应用。',
      buttonText: '访问应用 ➜',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 inline-block" viewBox="0 0 24 24" fill="none" stroke="#E32636" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
    };

    this.downloadLinks = [
      { 
        name: '百度网盘', 
        url: 'https://pan.baidu.com/s/5YvtunmbZbcj-2qAokdy6dQ',
        description: '点击跳转至网盘下载桌面版应用。',
        buttonText: '获取更新 ➜',
        icon: `<svg viewBox="0 0 64 64" class="w-12 h-12 inline-block"><path fill="#2e82ff" d="M42.6 45.3c-2.4-2.6-6-3.8-9.9-3.8s-7.5 1.2-9.9 3.8c-1.3 1.4-3.1 2.2-4.9 2.2-3.8 0-6.9-3.1-6.9-6.9 0-3.6 2.8-6.5 6.3-6.9 1.4-4.8 5.8-8.3 11-8.3s9.6 3.5 11 8.3c3.5.4 6.3 3.3 6.3 6.9 0 3.8-3.1 6.9-6.9 6.9-1.8 0-3.6-.8-4.9-2.2zM21.1 32.5c-1.5 0-2.8-1.2-2.8-2.8s1.2-2.8 2.8-2.8 2.8 1.2 2.8 2.8-1.3 2.8-2.8 2.8z"></path></svg>`
      },
      { 
        name: '夸克网盘', 
        url: 'https://pan.quark.cn/s/1a9ca6924dff',
        description: '点击跳转至网盘下载桌面版应用。',
        buttonText: '获取更新 ➜',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 inline-block" viewBox="0 0 24 24" fill="none" stroke="#6146F4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="m15 15-3-3"></path></svg>`
      },
      { 
        name: 'OneDrive', 
        url: 'https://1drv.ms/f/c/474d1ec9b29e5075/IgCewBjkuvOLQKY_HD8dPkHBAVJyLxB3EtucY8F5JabOD1w?e=eIiJYb',
        description: '点击跳转至网盘下载桌面版应用。',
        buttonText: '获取更新 ➜',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 inline-block" viewBox="0 0 24 24" fill="none" stroke="#0078D4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`
      },
    ];
  }
}