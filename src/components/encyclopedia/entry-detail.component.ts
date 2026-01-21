

import { Component, inject, signal, effect, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../services/data.service';
import { FormsModule } from '@angular/forms';
import { Location as NgLocation } from '@angular/common';

@Component({
  selector: 'app-entry-detail',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="h-full flex flex-col bg-white overflow-hidden relative">
      <!-- Top Bar -->
      <!-- Added pl-24 to avoid overlap with global sidebar toggle -->
      <div class="flex justify-between items-center p-4 pl-24 border-b-4 border-black shrink-0">
        <button (click)="goBack()" class="bauhaus-btn bg-white px-3 py-1 text-sm">← 返回</button>
        <div class="flex items-center gap-2">
           <button (click)="toggleFav()" class="w-10 h-10 flex items-center justify-center transition-transform active:scale-90 group">
             <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 transition-all" 
                [class.fill-[#E32636]]="isFav()"
                [class.stroke-[#E32636]]="isFav()"
                [class.stroke-black]="!isFav()"
                [class.fill-transparent]="!isFav()"
                [class.group-hover:stroke-[#E32636]]="true"
                viewBox="0 0 24 24" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
             </svg>
           </button>
           @if (dataService.isAdmin()) {
             <button (click)="toggleEdit()" class="bauhaus-btn bauhaus-btn-accent px-3 py-1">
               {{ isEditing() ? '保存' : '编辑' }}
             </button>
             <button (click)="showDeleteModal.set(true)" class="bauhaus-btn bauhaus-btn-danger px-3 py-1">删除</button>
           }
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 md:p-8 pb-20">
        @if (entry(); as e) {
          @if (isEditing()) {
             <!-- Edit Mode -->
             <div class="max-w-3xl mx-auto flex flex-col gap-6 pb-10">
                <div class="bg-gray-100 p-4 border-2 border-dashed border-gray-400 text-sm text-gray-700">
                  <p class="font-bold text-base text-black mb-1">管理员编辑模式</p>
                  <p>您可以修改所有内容。上传的图片将自动压缩至 &lt; 130KB 并存储于应用内。</p>
                </div>

                <div>
                  <label class="font-bold text-sm uppercase tracking-wider text-gray-600">中文术语</label>
                  <input [(ngModel)]="editForm.term" class="mt-1 w-full border-2 border-black p-3 font-medium focus:outline-none focus:bg-yellow-50 focus:ring-2 ring-offset-2 ring-black">
                </div>
                
                <div>
                  <label class="font-bold text-sm uppercase tracking-wider text-gray-600">英文术语</label>
                  <input [(ngModel)]="editForm.termEn" class="mt-1 w-full border-2 border-black p-3 font-medium focus:outline-none focus:bg-yellow-50 focus:ring-2 ring-offset-2 ring-black">
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="font-bold text-sm uppercase tracking-wider text-gray-600">分类</label>
                    <input [(ngModel)]="editForm.category" class="mt-1 w-full border-2 border-black p-3 font-medium focus:outline-none focus:bg-yellow-50 focus:ring-2 ring-offset-2 ring-black">
                  </div>
                  <div>
                    <label class="font-bold text-sm uppercase tracking-wider text-gray-600">子分类</label>
                    <input [(ngModel)]="editForm.subcategory" class="mt-1 w-full border-2 border-black p-3 font-medium focus:outline-none focus:bg-yellow-50 focus:ring-2 ring-offset-2 ring-black">
                  </div>
                </div>

                <div>
                  <label class="font-bold text-sm uppercase tracking-wider text-gray-600">简述</label>
                  <textarea [(ngModel)]="editForm.definition" class="mt-1 w-full border-2 border-black p-3 h-24 font-medium focus:outline-none focus:bg-yellow-50 focus:ring-2 ring-offset-2 ring-black"></textarea>
                </div>

                <div>
                  <label class="font-bold text-sm uppercase tracking-wider text-gray-600">详细解析</label>
                  <textarea [(ngModel)]="editForm.details" class="mt-1 w-full border-2 border-black p-3 h-48 font-medium focus:outline-none focus:bg-yellow-50 focus:ring-2 ring-offset-2 ring-black"></textarea>
                </div>

                <div>
                  <label class="font-bold text-sm uppercase tracking-wider text-gray-600">配图 (点击上传替换)</label>
                  <div class="mt-1 border-2 border-dashed border-black p-4 bg-gray-50 text-center relative group cursor-pointer hover:bg-yellow-50 transition-colors">
                    <input type="file" (change)="handleImageUpload($event)" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10">
                    <div class="flex flex-col items-center gap-2">
                      <span class="text-4xl">📷</span>
                      <span class="text-sm font-bold underline">选择图片文件</span>
                      <span class="text-xs text-gray-500">支持 JPG/PNG, 自动压缩</span>
                    </div>
                  </div>
                </div>
                
                @if (editForm.imageUrl) {
                  <div class="mt-2">
                    <p class="text-xs font-bold mb-2">当前图片预览:</p>
                    <img [src]="editForm.imageUrl" class="w-full max-h-60 object-contain border-2 border-black bg-white p-1">
                  </div>
                }
             </div>
          } @else {
            <!-- View Mode -->
            <div class="max-w-4xl mx-auto">
              <!-- Header Info -->
              <div class="mb-8">
                <div class="flex gap-2 mb-3">
                  <span class="bg-[#1C39BB] text-white px-3 py-1 border-2 border-black font-bold text-sm uppercase tracking-wide">{{ e.category }}</span>
                  <span class="bg-gray-200 px-3 py-1 border-2 border-black font-bold text-sm uppercase tracking-wide">{{ e.subcategory }}</span>
                </div>
                <h1 class="text-4xl md:text-5xl font-black mb-1 break-words tracking-tighter">{{ e.term }}</h1>
                <h2 class="text-xl md:text-2xl font-serif italic text-gray-500 mb-6">{{ e.termEn }}</h2>
                <div class="p-5 bg-yellow-50 border-l-8 border-[#FFD700]">
                  <p class="font-normal text-lg lg:text-xl leading-relaxed font-serif">{{ e.definition }}</p>
                </div>
              </div>

              <!-- Media Section -->
              <div class="mb-10 border-4 border-black shadow-[8px_8px_0px_0px_black] p-1 bg-white">
                <div class="aspect-video bg-gray-100 overflow-hidden relative border-b-2 border-black">
                  @if(e.imageUrl) {
                    <img [src]="e.imageUrl" class="w-full h-full object-cover" alt="{{e.term}}">
                  } @else {
                    <div class="w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg">NO IMAGE</div>
                  }
                </div>
                <div class="p-2 text-xs font-mono text-center bg-black text-white tracking-wider">FIGURE 1.1 - {{ e.term }} 示意图</div>
              </div>

              <!-- Details -->
              <div class="prose prose-lg max-w-none">
                <h3 class="font-black text-2xl border-b-4 border-black inline-block pb-1 mb-4">详细解析</h3>
                <p class="whitespace-pre-wrap leading-loose text-justify">{{ e.details }}</p>
              </div>
            </div>
          }
        } @else {
          <div class="p-10 text-center text-gray-500 font-bold text-lg">条目未找到或正在加载...</div>
        }
      </div>

      @if (showDeleteModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="showDeleteModal.set(false)"></div>
            <div class="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_black] max-w-sm w-full relative z-10">
                <h3 class="font-black text-2xl mb-4 text-center uppercase pb-3 border-b-4 border-black font-serif">确认删除</h3>
                <p class="my-6 text-center">确定要删除条目 “<strong class="text-[#E32636]">{{ entry()?.term }}</strong>” 吗？<br>此操作不可恢复。</p>
                <div class="flex justify-center gap-4">
                    <button (click)="showDeleteModal.set(false)" class="bauhaus-btn bg-white px-6 py-2">取消</button>
                    <button (click)="confirmDelete()" class="bauhaus-btn bauhaus-btn-danger px-6 py-2">确认删除</button>
                </div>
            </div>
        </div>
      }
    </div>
  `
})
export class EntryDetailComponent {
  route: ActivatedRoute = inject(ActivatedRoute);
  router: Router = inject(Router);
  location: NgLocation = inject(NgLocation);
  dataService = inject(DataService);

  entryId = signal<string>('');
  entry = computed(() => this.dataService.getEntry(this.entryId())());
  
  isFav = computed(() => this.entryId() ? this.dataService.isFavorite(this.entryId())() : false);
  
  isEditing = signal(false);
  editForm: any = {};
  
  showDeleteModal = signal(false);

  constructor() {
    this.route.params.subscribe(p => {
      this.entryId.set(p['id']);
      // Add to history when viewed
      if (p['id'] && this.entry()) {
        this.dataService.addToHistory(this.entry()!.term);
      }
    });

    this.route.queryParams.subscribe(p => {
      if (p['edit'] === 'true' && this.dataService.isAdmin()) {
        this.isEditing.set(true);
      }
    });

    effect(() => {
      if (this.isEditing() && this.entry()) {
        this.editForm = { ...this.entry() };
      }
    });
  }

  goBack() {
    this.location.back();
  }

  toggleFav() {
    if(this.entryId()) this.dataService.toggleFavorite(this.entryId());
  }

  toggleEdit() {
    if (this.isEditing() && this.entry() && this.editForm.id) {
        this.dataService.updateEntry(this.editForm);
    }
    this.isEditing.update(v => !v);
  }

  confirmDelete() {
    this.dataService.deleteEntry(this.entryId());
    this.showDeleteModal.set(false);
    this.router.navigate(['/encyclopedia']);
  }

  async handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      try {
        const compressedBase64 = await this.dataService.compressImage(input.files[0]);
        this.editForm.imageUrl = compressedBase64;
      } catch (e) {
        console.error(e);
      }
    }
  }
}