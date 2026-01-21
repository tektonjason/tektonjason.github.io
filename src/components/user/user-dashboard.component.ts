
import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService, Entry } from '../../services/data.service';
import { NgClass } from '@angular/common';
import pinyin from 'pinyin';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [RouterLink, NgClass],
  template: `
    <div class="h-full flex flex-col bg-[#f8f7f5]">
      
      <!-- Top Header for Toggle -->
       <div class="p-4 bg-white flex items-center gap-4 border-b-4 border-black shrink-0 pl-24 transition-all">
          <h2 class="text-xl font-black uppercase">用户中心</h2>
       </div>

      <!-- Tab Header -->
      <div class="flex border-b-4 border-black bg-white shrink-0">
        <button 
          (click)="activeTab.set('favorites')"
          class="flex-1 py-4 font-black text-center text-lg transition-colors border-r-2 border-black"
          [class.bg-[#FFD700]]="activeTab() === 'favorites'"
          [class.text-black]="activeTab() === 'favorites'"
        >我的收藏</button>
        <button 
          (click)="activeTab.set('history')"
          class="flex-1 py-4 font-black text-center text-lg transition-colors"
          [class.bg-[#E32636]]="activeTab() === 'history'"
          [class.text-white]="activeTab() === 'history'"
        >浏览历史</button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 md:p-6">
        @if (activeTab() === 'favorites') {
           @if (favEntries().length === 0) {
             <div class="text-center mt-10 text-gray-500">
               <div class="text-4xl mb-2">
                 <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 inline-block stroke-black" viewBox="0 0 24 24" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                 </svg>
               </div>
               <p class="font-bold text-lg text-gray-600 mt-2">暂无收藏内容</p>
             </div>
           } @else {
             <div class="grid gap-3">
               @for (entry of favEntries(); track entry.id) {
                 <div class="bg-white border-2 border-black p-3 shadow-[4px_4px_0px_0px_black] flex justify-between items-center transition-all duration-200 hover:shadow-[6px_6px_0px_0px_black] hover:-translate-y-0.5 hover:bg-yellow-50">
                   <div>
                      <h3 class="font-bold text-lg">{{ entry.term }}</h3>
                      <p class="text-sm text-gray-500">{{ entry.category }}</p>
                   </div>
                   <div class="flex items-center gap-2">
                     <a [routerLink]="['/entry', entry.id]" class="bauhaus-btn bg-white text-black px-2 py-1 text-xs">查看</a>
                     <button (click)="dataService.toggleFavorite(entry.id)" class="w-8 h-8 flex items-center justify-center hover:bg-red-100 group transition-colors rounded-full border-2 border-transparent hover:border-black">
                       <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 stroke-black group-hover:stroke-red-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke-width="2.5">
                         <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                       </svg>
                     </button>
                   </div>
                 </div>
               }
             </div>
           }
        } @else {
           <div class="flex justify-between items-center mb-4">
              <h2 class="font-bold text-xl">最近访问</h2>
              <button (click)="dataService.clearHistory()" class="text-sm text-red-500 underline font-bold hover:text-red-700">清空历史</button>
           </div>
           @if (historyEntries().length === 0) {
              <div class="text-center mt-10 text-gray-500">
                <div class="text-6xl mb-2">🕒</div>
                <p class="font-bold text-lg text-gray-600 mt-2">暂无历史记录</p>
              </div>
           } @else {
             <div class="flex flex-col gap-3">
               @for (entry of historyEntries(); track entry.id) {
                 <a [routerLink]="['/entry', entry.id]" class="bg-white border-2 border-black p-3 flex items-center gap-4 group transition-all duration-200 hover:bg-yellow-50 hover:shadow-[4px_4px_0px_0px_black] hover:-translate-y-px">
                   <div class="w-10 h-10 bg-gray-200 border-2 border-black flex items-center justify-center font-black text-xl text-gray-500 group-hover:bg-[#FFD700] transition-colors shrink-0">
                     {{ entry.firstPinyinLetter }}
                   </div>
                   <div>
                     <h4 class="font-bold group-hover:underline">{{ entry.term }}</h4>
                     <p class="text-sm text-gray-500 font-mono">{{ entry.category }}</p>
                   </div>
                   <div class="ml-auto text-black group-hover:text-[#1C39BB] transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6" />
                     </svg>
                   </div>
                 </a>
               }
             </div>
           }
        }
      </div>
    </div>
  `
})
export class UserDashboardComponent {
  dataService = inject(DataService);
  route: ActivatedRoute = inject(ActivatedRoute);
  
  activeTab = signal<'favorites' | 'history'>('favorites');

  constructor() {
    this.route.queryParams.subscribe(p => {
      if (p['tab'] === 'history') this.activeTab.set('history');
      else this.activeTab.set('favorites');
    });
  }

  favEntries = computed(() => {
    const ids = this.dataService.favorites();
    return this.dataService.entries().filter(e => ids.includes(e.id));
  });

  historyEntries = computed(() => {
    const historyTerms = this.dataService.history();
    const allEntries = this.dataService.entries();
    return historyTerms
      .map(term => {
        const entry = allEntries.find(e => e.term === term);
        if (!entry) return null;

        const pinyinArray = pinyin(entry.term, {
          style: pinyin.STYLE_FIRST_LETTER,
        });
        const firstLetter = (pinyinArray && pinyinArray[0]?.[0])
          ? pinyinArray[0][0].toUpperCase()
          : '?';

        return { ...entry, firstPinyinLetter: firstLetter };
      })
      .filter((entry): entry is (Entry & { firstPinyinLetter: string }) => !!entry); 
  });
}