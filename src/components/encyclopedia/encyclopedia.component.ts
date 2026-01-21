
import { Component, inject, computed, signal, AfterViewInit, ViewChild, ElementRef, effect } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-encyclopedia',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="h-full flex flex-col p-4 md:p-6 overflow-hidden bg-[#f8f7f5]">
      
      <!-- Top Toolbar -->
      <!-- Adjusted padding-left to pl-24 to clear the global sidebar toggle button -->
      <div class="flex items-stretch gap-3 mb-4 md:mb-6 shrink-0 h-10 md:h-12 pl-24">
        
        <!-- Search Input (Blue Box Area) -->
        <div class="relative flex-1 max-w-xl h-full">
          <input 
            type="text" 
            [(ngModel)]="searchQuery"
            placeholder="搜索..." 
            class="w-full h-full px-4 text-base border-2 border-black shadow-[4px_4px_0px_0px_black] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_black] transition-all font-bold placeholder-gray-400 rounded-none bg-white"
          >
          @if (searchQuery()) {
            <button (click)="searchQuery.set('')" class="absolute right-0 top-0 h-full w-10 flex items-center justify-center font-bold text-gray-400 hover:text-red-500">X</button>
          }
        </div>
      </div>

      <!-- Categories Filter (Horizontal Scroll) -->
      <div class="flex flex-nowrap gap-2 mb-4 md:mb-6 shrink-0 overflow-x-auto pb-2 custom-scrollbar border-b-2 border-transparent hover:border-gray-200 transition-colors">
        <button 
          (click)="selectedCategory.set('all')"
          class="flex-shrink-0 whitespace-nowrap px-4 py-2 border-2 border-black font-bold transition-all text-sm uppercase tracking-wide active:translate-y-0.5"
          [class.bg-[#FFD700]]="selectedCategory() === 'all'"
          [class.text-black]="selectedCategory() === 'all'"
          [class.shadow-[2px_2px_0px_0px_black]]="selectedCategory() === 'all'"
          [class.bg-white]="selectedCategory() !== 'all'"
          [class.hover:bg-gray-100]="selectedCategory() !== 'all'"
        >全部</button>
        @for (cat of categories(); track cat) {
          <button 
            (click)="selectedCategory.set(cat)"
             class="flex-shrink-0 whitespace-nowrap px-4 py-2 border-2 border-black font-bold transition-all text-sm uppercase tracking-wide active:translate-y-0.5"
            [class.bg-[#FFD700]]="selectedCategory() === cat"
            [class.text-black]="selectedCategory() === cat"
            [class.shadow-[2px_2px_0px_0px_black]]="selectedCategory() === cat"
            [class.bg-white]="selectedCategory() !== cat"
            [class.hover:bg-blue-50]="selectedCategory() !== cat"
          >
            {{ cat }}
          </button>
        }
      </div>

      <!-- Content Grid -->
      <div #scrollContainer class="flex-1 overflow-y-auto pr-1 pb-20 custom-scrollbar">
        @if (filteredEntries().length === 0) {
          <div class="flex flex-col items-center justify-center h-60 opacity-50 text-center">
            <div class="text-6xl mb-4">🧐</div>
            <p class="font-bold text-xl">未找到相关条目</p>
            <p class="text-gray-500 mt-1">请尝试更换关键词或分类</p>
          </div>
        }

        <!-- 
           Mobile: grid-cols-2, smaller gap (gap-3)
           Desktop: grid-cols-2/3, larger gap (md:gap-6) 
        -->
        <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          @for (entry of filteredEntries(); track entry.id; let i = $index) {
            <!-- Mobile: p-3, Desktop: p-5 -->
            <a 
              [routerLink]="['/entry', entry.id]" 
              (click)="saveState(scrollContainer.scrollTop)" 
              class="bauhaus-card p-3 md:p-5 block relative group h-full flex flex-col hover:bg-white animate-pop-in"
              [style.animation-delay]="i < 21 ? (i * 30) + 'ms' : '0ms'"
            >
              <div class="flex justify-between items-start mb-2 md:mb-3">
                <!-- Mobile: text-[10px], Desktop: text-xs -->
                <span class="bg-[#FFD700] px-1.5 md:px-2 py-0.5 border border-black text-[10px] md:text-xs font-bold truncate max-w-[60%]">{{ entry.category }}</span>
                <span class="text-[10px] md:text-xs font-mono text-gray-500 truncate max-w-[35%]">{{ entry.subcategory }}</span>
              </div>
              <!-- Mobile: text-base, Desktop: text-xl -->
              <h3 class="text-base md:text-xl font-black tracking-tight mb-1 leading-tight group-hover:text-[#1C39BB] transition-colors line-clamp-2 md:line-clamp-none">{{ entry.term }}</h3>
              <!-- Mobile: text-xs, Desktop: text-sm -->
              <p class="text-xs md:text-sm italic text-gray-600 mb-2 md:mb-3 font-serif truncate">{{ entry.termEn }}</p>
              <!-- Mobile: text-xs, Desktop: text-sm -->
              <p class="text-xs text-gray-700 line-clamp-3 mb-2 md:mb-4 flex-1 leading-relaxed">{{ entry.definition }}</p>
              
              <div class="flex justify-end mt-auto">
                 <!-- Mobile: w-6 h-6, Desktop: w-8 h-8 -->
                 <div class="w-6 h-6 md:w-8 md:h-8 bg-black rounded-full flex items-center justify-center text-white group-hover:bg-[#E32636] transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                 </div>
              </div>
            </a>
          }
        </div>
      </div>

      <!-- Admin Add Button -->
      @if (dataService.isAdmin()) {
        <button (click)="createNew()" title="添加新词条" class="absolute bottom-8 right-8 w-14 h-14 md:w-16 md:h-16 bg-[#E32636] border-4 border-black shadow-[4px_4px_0px_0px_black] rounded-full flex items-center justify-center text-white text-3xl md:text-4xl font-black active:shadow-none active:translate-x-1 active:translate-y-1 transition-all z-20 hover:scale-105">
          +
        </button>
      }
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      height: 8px;
      width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: black;
      border-radius: 4px;
      border: 2px solid #f8f7f5;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #1C39BB;
    }
  `]
})
export class EncyclopediaComponent implements AfterViewInit {
  dataService = inject(DataService);
  router: Router = inject(Router);
  searchQuery = signal('');
  selectedCategory = signal(this.dataService.encyclopediaSelectedCategory());

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  private categoryOrder = [
    "中国古代建筑", "西方古典建筑", "现代构造与系统", "建筑风格与设计思潮", 
    "结构与构造理论", "建筑材料与施工工艺", "可持续与绿色建筑", 
    "城市规划与公共空间", "室内设计与景观设计", "建筑法规、标准与项目管理", 
    "数字化、BIM 与智能建筑", "绘图与制图", "建筑史、理论与批评"
  ];

  constructor() {
    // When the selected category changes in this component, update the service
    // so it's persisted across navigations.
    effect(() => {
      this.dataService.encyclopediaSelectedCategory.set(this.selectedCategory());
    });
  }

  ngAfterViewInit(): void {
    // Restore scroll position after view has been initialized and content is rendered.
    // A timeout ensures the DOM has been updated with the list items.
    setTimeout(() => {
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTop = this.dataService.encyclopediaScrollPosition();
      }
    }, 0);
  }

  saveState(scrollTop: number) {
    // Save the current scroll position to the service before navigating away.
    this.dataService.encyclopediaScrollPosition.set(scrollTop);
  }

  categories = computed(() => {
    const cats = new Set<string>(this.dataService.entries().map(e => e.category));
    return Array.from(cats).sort((a: string, b: string) => {
      const idxA = this.categoryOrder.indexOf(a);
      const idxB = this.categoryOrder.indexOf(b);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  });

  filteredEntries = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const cat = this.selectedCategory();
    let list = this.dataService.entries().filter(e => {
      const matchCat = cat === 'all' || e.category === cat;
      const matchSearch = !q || e.term.toLowerCase().includes(q) || 
                          e.termEn.toLowerCase().includes(q) || 
                          e.definition.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
    return list.slice(0, 200); 
  });

  createNew() {
    const currentCat = this.selectedCategory() === 'all' ? '未分类' : this.selectedCategory();
    const newId = 'custom_' + Date.now();
    const newEntry = {
      id: newId,
      category: currentCat,
      subcategory: '新增',
      term: '新词条 (点击编辑)',
      termEn: 'New Entry',
      definition: '请点击上方“编辑”按钮修改此内容。',
      details: '在此处添加详细内容...',
      imageUrl: '',
      isCustom: true
    };
    this.dataService.addEntry(newEntry);
    this.router.navigate(['/entry', newId], { queryParams: { edit: 'true' } });
  }
}