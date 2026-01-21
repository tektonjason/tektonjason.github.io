
import { Component, inject, signal, computed } from '@angular/core';
import { DataService, Link } from '../../services/data.service';
import { FormsModule } from '@angular/forms';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [FormsModule, NgStyle],
  template: `
    <div class="h-full flex flex-col p-6 bg-[#f8f7f5] overflow-y-auto">
      
      <!-- Top Header -->
      <div class="flex items-center gap-4 mb-8 pl-24 transition-all">
        <h2 class="text-3xl md:text-4xl font-black border-l-8 border-[#1C39BB] pl-4 uppercase">设计资源库</h2>
      </div>
      
      @for (group of groupedLinks(); track group.category) {
        <section class="mb-10">
          <h3 class="text-2xl font-bold mb-4 flex items-center gap-3">
            <span class="w-4 h-4 bg-black"></span>
            {{ group.category }}
          </h3>
          <!-- 
             Mobile: grid-cols-2, gap-3
             Desktop: grid-cols-2/3, gap-4 
          -->
          <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            @for (link of group.links; track link.id) {
              <!-- Mobile: p-3, Desktop: p-4 -->
              <div class="bauhaus-card p-3 md:p-4 flex flex-col h-full relative group hover:bg-white">
                
                <!-- Tags (Top Right) -->
                @if (link.tags && link.tags.length > 0) {
                  <div class="absolute top-2 right-2 flex gap-1 flex-wrap justify-end max-w-[50%]">
                    @for (tag of link.tags; track tag) {
                      <span 
                        class="text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 border border-black/20 backdrop-blur-sm"
                        [ngStyle]="getTagStyle(tag)"
                      >
                        {{ tag }}
                      </span>
                    }
                  </div>
                }

                <div class="flex justify-between items-start mb-2 pr-8 min-h-[2.5rem] md:min-h-[3.5rem]">
                   <!-- Mobile: text-sm, Desktop: text-lg -->
                   <h4 class="text-sm md:text-lg font-black w-full break-words" title="{{link.title}}">{{ link.title }}</h4>
                   @if (dataService.isAdmin()) {
                     <button (click)="deleteLink(link.id)" class="text-red-600 font-bold text-xs hover:bg-red-50 px-1 border border-red-600 shrink-0 ml-1">X</button>
                   }
                </div>
                <!-- Mobile: text-xs, line-clamp-3. Desktop: text-sm -->
                <p class="text-xs md:text-sm text-gray-600 mb-2 md:mb-4 flex-1 line-clamp-3 md:line-clamp-none">{{ link.description }}</p>
                <!-- Mobile: smaller text/padding -->
                <a [href]="link.url" target="_blank" class="bauhaus-btn bg-white text-black text-[10px] md:text-xs text-center py-1.5 md:py-2 px-2 md:px-4 hover:bg-black hover:text-white mt-auto">
                  访问网站 ➜
                </a>
              </div>
            }
          </div>
        </section>
      }

      @if (dataService.isAdmin()) {
        <div class="mt-8 border-4 border-black p-6 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 class="font-bold text-xl mb-4 border-b-2 border-black pb-2">添加新资源 (Admin)</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="font-bold text-sm uppercase tracking-wider text-gray-600">分类</label>
              <input [(ngModel)]="newCategory" placeholder="例如: 建筑资讯" class="mt-1 w-full border-2 border-black p-3 font-medium focus:outline-none focus:bg-yellow-50 focus:ring-2 ring-offset-2 ring-black">
            </div>
            <div>
              <label class="font-bold text-sm uppercase tracking-wider text-gray-600">网站名称</label>
              <input [(ngModel)]="newTitle" placeholder="例如: ArchDaily" class="mt-1 w-full border-2 border-black p-3 font-medium focus:outline-none focus:bg-yellow-50 focus:ring-2 ring-offset-2 ring-black">
            </div>
            <div class="md:col-span-2">
              <label class="font-bold text-sm uppercase tracking-wider text-gray-600">URL</label>
              <input [(ngModel)]="newUrl" placeholder="https://..." class="mt-1 w-full border-2 border-black p-3 font-medium focus:outline-none focus:bg-yellow-50 focus:ring-2 ring-offset-2 ring-black">
            </div>
            <div class="md:col-span-2">
               <label class="font-bold text-sm uppercase tracking-wider text-gray-600">简短描述</label>
              <input [(ngModel)]="newDesc" placeholder="网站的一句话介绍" class="mt-1 w-full border-2 border-black p-3 font-medium focus:outline-none focus:bg-yellow-50 focus:ring-2 ring-offset-2 ring-black">
            </div>
          </div>
          <button (click)="addLink()" class="bauhaus-btn bauhaus-btn-primary w-full py-3 mt-6 text-lg">添加资源</button>
        </div>
      }
    </div>
  `
})
export class ResourcesComponent {
  dataService = inject(DataService);
  
  newCategory = signal('');
  newTitle = signal('');
  newUrl = signal('');
  newDesc = signal('');

  private categoryOrder = [
    '建筑资讯与媒体', '规范、学习与学术', '地图、气象与数据', '软件、插件与渲染',
    '材质、配景与素材', '配色、平面与图解', '实用工具'
  ];

  groupedLinks = computed(() => {
    const links = this.dataService.webLinks();
    const map = new Map<string, Link[]>();
    links.forEach(l => {
      const cat = l.category || '未分类';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(l);
    });
    const groups = Array.from(map.entries()).map(([category, links]) => ({ category, links }));
    return groups.sort((a, b) => {
      const idxA = this.categoryOrder.indexOf(a.category);
      const idxB = this.categoryOrder.indexOf(b.category);
      const valA = idxA === -1 ? 999 : idxA;
      const valB = idxB === -1 ? 999 : idxB;
      return valA - valB;
    });
  });

  addLink() {
    if (this.newTitle() && this.newUrl() && this.newCategory()) {
      this.dataService.addLink({
        id: Date.now().toString(),
        category: this.newCategory(),
        title: this.newTitle(),
        url: this.newUrl(),
        description: this.newDesc() || '暂无描述'
      });
      this.newTitle.set('');
      this.newUrl.set('');
      this.newDesc.set('');
    }
  }

  deleteLink(id: string) {
    if(confirm('确定要删除这个资源吗?')) {
      this.dataService.removeLink(id);
    }
  }

  getTagStyle(tag: string) {
    switch (tag) {
      case '人物': return { backgroundColor: 'rgba(255, 215, 0, 0.4)', color: 'black' };
      case '材质': return { backgroundColor: 'rgba(28, 57, 187, 0.2)', color: '#1C39BB' };
      case '模型': return { backgroundColor: 'rgba(227, 38, 54, 0.2)', color: '#E32636' };
      case '环境': return { backgroundColor: 'rgba(0, 166, 126, 0.2)', color: '#00664e' };
      case '尺寸': return { backgroundColor: 'rgba(0, 0, 0, 0.1)', color: 'black' };
      case '素材': return { backgroundColor: 'rgba(0, 150, 255, 0.2)', color: '#005f99' };
      case '配景': return { backgroundColor: 'rgba(128, 0, 128, 0.2)', color: 'purple' };
      case '剪影': return { backgroundColor: 'rgba(50, 50, 50, 0.2)', color: 'black' };
      default: return { backgroundColor: 'rgba(0,0,0,0.05)', color: 'gray' };
    }
  }
}