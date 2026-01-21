

import { Injectable, signal, computed, effect } from '@angular/core';

export interface Entry {
  id: string;
  category: string;
  subcategory: string;
  term: string;
  termEn: string;
  definition: string;
  details: string;
  imageUrl?: string;
  isCustom?: boolean;
}

export interface Link {
  id: string;
  title: string;
  url: string;
  category: string;
  description: string;
  tags?: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  // --- Layout State ---
  // Default to true, but we will adjust in constructor
  isSidebarOpen = signal<boolean>(true);

  // --- Admin State ---
  isAdmin = signal<boolean>(false);
  
  // --- Data Stores ---
  entries = signal<Entry[]>([]);
  favorites = signal<string[]>([]);
  history = signal<string[]>([]);
  webLinks = signal<Link[]>([]);
  chatHistory = signal<ChatMessage[]>([]);

  // --- Encyclopedia View State ---
  encyclopediaScrollPosition = signal<number>(0);
  encyclopediaSelectedCategory = signal<string>('all');

  constructor() {
    this.initLayout();
    this.loadFromStorage();
    // Only seed entries if completely empty
    // if (this.entries().length === 0) {
      this.seedArchipediaData();
    // }
    
    this.syncResources();

    effect(() => localStorage.setItem('arch_favorites', JSON.stringify(this.favorites())));
    effect(() => localStorage.setItem('arch_history', JSON.stringify(this.history())));
    effect(() => localStorage.setItem('arch_chat', JSON.stringify(this.chatHistory())));
    effect(() => localStorage.setItem('arch_entries', JSON.stringify(this.entries())));
    effect(() => localStorage.setItem('arch_links', JSON.stringify(this.webLinks())));
  }

  private initLayout() {
    // Check if running in browser environment
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768; // Tailwind md breakpoint
      // On mobile, start closed. On desktop, start open.
      this.isSidebarOpen.set(!isMobile);
    }
  }

  // --- Layout ---
  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  setSidebarState(isOpen: boolean) {
    this.isSidebarOpen.set(isOpen);
  }

  // --- Auth ---
  login(email: string, pass: string): boolean {
    if (email === 'tektonjason@163.com' && pass === '123456') {
      this.isAdmin.set(true);
      return true;
    }
    return false;
  }

  logout() {
    this.isAdmin.set(false);
  }

  // --- Entry Management ---
  getEntry(id: string) {
    return computed(() => this.entries().find(e => e.id === id));
  }

  addEntry(entry: Entry) {
    this.entries.update(list => [...list, entry]);
  }

  updateEntry(updated: Entry) {
    this.entries.update(list => list.map(e => e.id === updated.id ? updated : e));
  }

  deleteEntry(id: string) {
    this.entries.update(list => list.filter(e => e.id !== id));
  }

  // --- Favorites ---
  toggleFavorite(id: string) {
    this.favorites.update(favs => {
      if (favs.includes(id)) return favs.filter(f => f !== id);
      return [...favs, id];
    });
  }

  isFavorite(id: string) {
    return computed(() => this.favorites().includes(id));
  }

  // --- History ---
  addToHistory(term: string) {
    this.history.update(h => [term, ...h.filter(t => t !== term)].slice(0, 50));
  }

  clearHistory() {
    this.history.set([]);
  }

  // --- Chat ---
  addMessage(msg: ChatMessage) {
    this.chatHistory.update(h => [...h, msg]);
  }
  
  clearChat() {
    this.chatHistory.set([]);
  }

  // --- Links ---
  addLink(link: Link) {
    this.webLinks.update(l => [...l, link]);
  }
  
  removeLink(id: string) {
    this.webLinks.update(l => l.filter(i => i.id !== id));
  }

  updateLink(link: Link) {
      this.webLinks.update(l => l.map(i => i.id === link.id ? link : i));
  }

  // --- Image Handling ---
  async compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          let quality = 0.7;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          
          while (dataUrl.length > 135000 && quality > 0.1) {
             quality -= 0.1;
             dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  private loadFromStorage() {
    try {
      const e = localStorage.getItem('arch_entries');
      if (e) this.entries.set(JSON.parse(e));
      const f = localStorage.getItem('arch_favorites');
      if (f) this.favorites.set(JSON.parse(f));
      const h = localStorage.getItem('arch_history');
      if (h) this.history.set(JSON.parse(h));
      const c = localStorage.getItem('arch_chat');
      if (c) this.chatHistory.set(JSON.parse(c));
      const w = localStorage.getItem('arch_links');
      if (w) this.webLinks.set(JSON.parse(w));
    } catch (err) {
      console.error('Failed to load storage', err);
    }
  }

  private syncResources() {
    const seedLinks = this.getSeedResources();
    const currentLinks = this.webLinks();
    const currentMap = new Map<string, Link>();
    for (const link of currentLinks) {
      currentMap.set(link.id, link);
    }
    
    let hasChanges = false;
    const merged = [...currentLinks];

    seedLinks.forEach(seed => {
      if (!currentMap.has(seed.id)) {
        merged.push(seed);
        hasChanges = true;
      } else {
        const existing = currentMap.get(seed.id);
        if (existing) {
          const tagsChanged = JSON.stringify(existing.tags) !== JSON.stringify(seed.tags);
          if (
            existing.category !== seed.category || 
            existing.url !== seed.url || 
            existing.title !== seed.title || 
            existing.description !== seed.description ||
            tagsChanged
          ) {
               const idx = merged.findIndex(m => m.id === seed.id);
               if (idx > -1) {
                 merged[idx] = { ...existing, ...seed };
                 hasChanges = true;
               }
          }
        }
      }
    });

    if (hasChanges) {
      this.webLinks.set(merged);
    }
  }

  private getSeedResources(): Link[] {
    return [
      { id: 'n1', category: '建筑资讯与媒体', title: 'ArchDaily', url: 'https://www.archdaily.com', description: '全球最受欢迎的建筑网站，提供最新的建筑新闻和项目。' },
      { id: 'n2', category: '建筑资讯与媒体', title: '建日筑闻', url: 'https://www.archdaily.cn/cn', description: 'ArchDaily 中国版，关注中国建筑现场与独立评论。' },
      { id: 'n3', category: '建筑资讯与媒体', title: 'Dezeen', url: 'https://www.dezeen.com', description: '世界上最有影响力的建筑、室内和设计杂志。' },
      { id: 'n4', category: '建筑资讯与媒体', title: '谷德设计网 (Gooood)', url: 'https://www.gooood.cn', description: '中国最受欢迎的建筑景观设计门户网站。' },
      { id: 'n5', category: '建筑资讯与媒体', title: '有方 (Position)', url: 'https://www.archiposition.com', description: '高品质建筑文化机构，致力于建筑展览与学术推广。' },
      { id: 'n6', category: '建筑资讯与媒体', title: 'Divisare', url: 'https://divisare.com', description: '精心策划的当代建筑图库，注重视觉质量。' },
      { id: 'n7', category: '建筑资讯与媒体', title: 'Architizer', url: 'https://architizer.com', description: '连接建筑师与建材制造商的平台，拥有丰富的项目库。' },
      { id: 'n8', category: '建筑资讯与媒体', title: 'Detail', url: 'https://www.detail.de', description: '专注于建筑细节构造和节点设计的专业期刊。' },
      { id: 'n9', category: '建筑资讯与媒体', title: 'World-Architects', url: 'https://www.world-architects.com', description: '精选全球优秀建筑师及其作品的高端网络平台。' },
      { id: 'n10', category: '建筑资讯与媒体', title: 'Archinect', url: 'https://archinect.com', description: '建立建筑师社区与职业网络的资讯平台，包含求职与论坛。' },
      { id: 'n11', category: '建筑资讯与媒体', title: 'Issuu', url: 'https://issuu.com', description: '全球最大的电子出版平台，海量学生作品集与建筑杂志在线阅读。' },
      { id: 'n12', category: '建筑资讯与媒体', title: 'Google Arts & Culture', url: 'https://artsandculture.google.com', description: '谷歌艺术与文化，高清浏览全球历史建筑、博物馆与艺术品。' },
      { id: 'n13', category: '建筑资讯与媒体', title: '灵感行星 (EasyRef)', url: 'https://next.easyref.design', description: '聚合全球设计灵感的瀑布流网站，高效寻找参考图。' },
      { id: 'l1', category: '规范、学习与学术', title: '建标库', url: 'https://www.jianbiaoku.com', description: '最全的国家工程建设标准、图集与规范查询平台。' },
      { id: 'l2', category: '规范、学习与学术', title: '犀流堂 (RhinoStudio)', url: 'https://www.rhinostudio.cn', description: '专业的 Rhino/Grasshopper 参数化建模中文教程网。' },
      { id: 'l3', category: '规范、学习与学术', title: 'ResearchGate', url: 'https://www.researchgate.net', description: '全球科研人员的学术社交与论文分享平台。' },
      { id: 'l4', category: '规范、学习与学术', title: '建筑学长', url: 'https://www.jianzhuxuezhang.com', description: '聚合建筑考研、设计教程与资源的综合学习平台。' },
      { id: 'l5', category: '规范、学习与学术', title: 'Google Scholar', url: 'https://scholar.google.com', description: '全球最大的学术文献搜索引擎。' },
      { id: 'l6', category: '规范、学习与学术', title: '茶思屋 (Chaspark)', url: 'https://www.chaspark.com', description: '黄大年茶思屋，科技与学术交流平台。' },
      { id: 'n14', category: '规范、学习与学术', title: 'ArchStudio', url: 'http://www.arch-studio.cn', description: '建筑相关的网课和视频教程资源。' },
      { id: 't1', category: '地图、气象与数据', title: 'CADMAPPER', url: 'https://cadmapper.com', description: '下载全球城市的CAD文件（DXF格式），包含建筑轮廓和道路。' },
      { id: 't2', category: '地图、气象与数据', title: 'OpenStreetMap', url: 'https://www.openstreetmap.org', description: '免费的维基世界地图，可导出矢量地理数据。' },
      { id: 't3', category: '地图、气象与数据', title: 'Windy', url: 'https://www.windy.com', description: '全球可视化天气预报，提供风场、气温等气象数据。' },
      { id: 't4', category: '地图、气象与数据', title: '高德开放平台', url: 'https://lbs.amap.com', description: '提供国内地图API、样式自定义和地理数据服务。' },
      { id: 't5', category: '地图、气象与数据', title: 'Mapbox', url: 'https://www.mapbox.com', description: '强大的自定义地图设计平台，支持高度风格化的地图输出。' },
      { id: 't6', category: '地图、气象与数据', title: 'Ladybug EPW Map', url: 'https://www.ladybug.tools/epwmap/', description: '获取全球各地的EPW气象数据文件，用于建筑能耗分析。' },
      { id: 't7', category: '地图、气象与数据', title: 'BBBike', url: 'https://extract.bbbike.org', description: '提取世界各地地图数据为多种格式。' },
      { id: 't8', category: '地图、气象与数据', title: 'City Roads', url: 'https://anvaka.github.io/city-roads/', description: '一键生成并导出任意城市的道路网矢量图。' },
      { id: 't9', category: '地图、气象与数据', title: 'Bus Line', url: 'http://bus.multeek.com/busline', description: '城市公交线路可视化工具，分析城市交通脉络。' },
      { id: 't10', category: '地图、气象与数据', title: 'Height Mapper', url: 'https://tangrams.github.io/heightmapper/', description: '全球地形高度图生成器，支持导出灰度置换贴图。' },
      { id: 't11', category: '地图、气象与数据', title: '全国风玫瑰汇总', url: 'https://www.shejiyizhou.com/thread-451-1-1.html', description: '建筑设计必备的中国各地气象风环境基础资料。' },
      { id: 't12', category: '地图、气象与数据', title: '建筑节能数据平台', url: 'https://buildingdata.xauat.edu.cn/#call-to-action', description: '提供精细化的建筑节能设计基础气象参数。' },
      { id: 't13', category: '地图、气象与数据', title: '规划云', url: 'http://guihuayun.com', description: '城乡规划行业的综合数据查询与工具服务平台。' },
      { id: 't14', category: '地图、气象与数据', title: '地图慧', url: 'http://e.dituhui.com', description: '在线制作统计地图与地理数据可视化的简易工具。' },
      { id: 's1', category: '软件、插件与渲染', title: 'Unreal Engine', url: 'https://www.unrealengine.com', description: '虚幻引擎，实时渲染与建筑可视化的未来工具。' },
      { id: 's2', category: '软件、插件与渲染', title: 'D5渲染器', url: 'https://www.d5render.com', description: '国产实时光线追踪渲染器，操作便捷效果惊艳。' },
      { id: 's3', category: '软件、插件与渲染', title: 'Rhino 3D', url: 'https://www.rhino3d.com', description: '强大的NURBS建模软件，参数化设计的基石。' },
      { id: 's4', category: '软件、插件与渲染', title: 'V-Ray', url: 'https://www.chaos.com/vray', description: '业界标杆级的物理渲染引擎，支持多种建模软件。' },
      { id: 's5', category: '软件、插件与渲染', title: 'Enscape', url: 'https://enscape3d.com', description: '即时交互式渲染软件，设计与表现同步，VR漫游首选。' },
      { id: 's6', category: '软件、插件与渲染', title: 'Blender', url: 'https://www.blender.org', description: '免费开源的全能三维创作套件，拥有庞大的社区插件。' },
      { id: 's7', category: '软件、插件与渲染', title: 'Corona', url: 'https://chaos.com/corona', description: '专注于写实与易用性的CPU渲染器，光影柔和。' },
      { id: 's8', category: '软件、插件与渲染', title: 'Chaos Vantage', url: 'https://www.chaos.com/vantage', description: '100% 实时光线追踪的大场景漫游工具。' },
      { id: 's9', category: '软件、插件与渲染', title: 'Grasshopper', url: 'https://www.grasshopper3d.com', description: 'Rhino内置的图形化参数化编程插件。' },
      { id: 's10', category: '软件、插件与渲染', title: 'Food4Rhino', url: 'https://www.food4rhino.com', description: 'Rhino与Grasshopper的全球最大插件资源社区。' },
      { id: 's11', category: '软件、插件与渲染', title: 'Revit', url: 'https://www.autodesk.com/products/revit', description: 'Autodesk旗下建筑信息模型(BIM)的核心软件。' },
      { id: 's12', category: '软件、插件与渲染', title: 'SketchUp', url: 'https://www.sketchup.com', description: '直观易用的推敲与建模工具，草图大师。' },
      { id: 'm1', category: '材质、配景与素材', title: 'Polyhaven', url: 'https://polyhaven.com', description: '免费的高质量HDRI、纹理和3D模型库(原HDRIHaven)。', tags: ['环境', '材质', '模型'] },
      { id: 'm2', category: '材质、配景与素材', title: 'Architextures', url: 'https://architextures.org', description: '在线生成无缝建筑纹理贴图的强大工具。', tags: ['材质'] },
      { id: 'm3', category: '材质、配景与素材', title: 'Textures.com', url: 'https://www.textures.com', description: '老牌纹理素材网站，资源极其丰富。', tags: ['材质'] },
      { id: 'm4', category: '材质、配景与素材', title: 'Sketchup Texture Club', url: 'https://www.sketchuptextureclub.com', description: '专为SketchUp用户提供的材质贴图库。', tags: ['材质'] },
      { id: 'm5', category: '材质、配景与素材', title: '3D Warehouse', url: 'https://3dwarehouse.sketchup.com', description: 'SketchUp官方模型库，拥有海量用户上传的模型。', tags: ['模型'] },
      { id: 'm6', category: '材质、配景与素材', title: 'Pexels', url: 'https://www.pexels.com', description: '高质量免费库存照片和视频，适用于效果图配景。', tags: ['环境'] },
      { id: 'm7', category: '材质、配景与素材', title: 'Pixabay', url: 'https://pixabay.com', description: '免费正版高清图片素材库。', tags: ['环境'] },
      { id: 'm8', category: '材质、配景与素材', title: 'Nonscandinavia', url: 'https://www.nonscandinavia.com', description: '提供非北欧（多样化种族）的人物配景素材。', tags: ['人物'] },
      { id: 'm9', category: '材质、配景与素材', title: 'Town Illust', url: 'https://town-illust.com', description: '提供日系城市建筑插画素材，适合分析图制作。', tags: ['配景'] },
      { id: 'm10', category: '材质、配景与素材', title: 'Dimensions', url: 'https://www.dimensions.com', description: '各种物品、家具和空间的标准尺寸数据库。', tags: ['尺寸'] },
      { id: 'm11', category: '材质、配景与素材', title: 'Toffu', url: 'https://toffu.co', description: '高质量的矢量配景人物和树木素材。', tags: ['人物', '配景'] },
      { id: 'm12', category: '材质、配景与素材', title: 'Skalgubbar', url: 'https://skalgubbar.se', description: '著名的北欧风格建筑配景人物素材库。', tags: ['人物'] },
      { id: 'm13', category: '材质、配景与素材', title: 'Meye', url: 'https://meye.dk', description: '哥本哈根视角的免费人物与环境素材。', tags: ['人物'] },
      { id: 'm14', category: '材质、配景与素材', title: 'MrCutout', url: 'https://mrcutout.com', description: '高质量的免抠人物、植被与物体素材库。', tags: ['人物', '配景'] },
      { id: 'm15', category: '材质、配景与素材', title: 'Elderly Entourage', url: 'https://elderlyentourage.cargo.site', description: '专注于老年人形象的建筑配景人物库。', tags: ['人物'] },
      { id: 'm16', category: '材质、配景与素材', title: 'Transparent Textures', url: 'https://www.transparenttextures.com', description: '免费的无缝背景纹理素材库。', tags: ['材质'] },
      { id: 'm17', category: '材质、配景与素材', title: 'Yajidesign', url: 'http://yajidesign.com', description: '提供丰富多样的箭头设计素材。', tags: ['素材'] },
      { id: 'm18', category: '材质、配景与素材', title: 'Fukidesign', url: 'https://fukidesign.com', description: '手绘风格的对话气泡素材库。', tags: ['素材'] },
      { id: 'm19', category: '材质、配景与素材', title: 'Kage-design', url: 'https://kage-design.com', description: '高质量的光影与剪影素材设计。', tags: ['配景'] },
      { id: 'm20', category: '材质、配景与素材', title: 'Pictogram2', url: 'https://pictogram2.com', description: '丰富的人物象形图和剪影素材。', tags: ['人物', '剪影'] },
      { id: 'c1', category: '配色、平面与图解', title: 'Adobe Color', url: 'https://color.adobe.com', description: '专业的在线配色轮和调色板生成工具。' },
      { id: 'c2', category: '配色、平面与图解', title: '分析图', url: 'https://www.fenxitu.cn', description: '专为建筑分析图设计的配色参考网站。' },
      { id: 'c3', category: '配色、平面与图解', title: 'MyColorSpace', url: 'https://mycolor.space', description: '输入主色调即可生成完美的配色方案。' },
      { id: 'c4', category: '配色、平面与图解', title: 'Dogma', url: 'http://dogma.name', description: '独特的拼贴风格建筑表现参考。' },
      { id: 'c5', category: '配色、平面与图解', title: 'Drawing Architecture', url: 'https://drawingarchitecture.tumblr.com', description: '汇集极具表现力的建筑绘画与图纸参考。' },
      { id: 'c6', category: '配色、平面与图解', title: 'Color Hunt', url: 'https://colorhunt.co', description: '每日更新的精选配色方案，寻找色彩灵感。' },
      { id: 'c7', category: '配色、平面与图解', title: 'Pantone Connect', url: 'https://connect.pantone.com', description: '潘通(Pantone)官方色彩平台，查找标准色号。' },
      { id: 'c8', category: '配色、平面与图解', title: 'Iconfont', url: 'https://www.iconfont.cn', description: '阿里巴巴矢量图标库，提供海量设计图标。' },
      { id: 'c9', category: '配色、平面与图解', title: 'Arqui9', url: 'https://arqui9.com', description: '英国顶级建筑可视化工作室，极致的光影与氛围。' },
      { id: 'c10', category: '配色、平面与图解', title: 'MIR', url: 'https://mir.no', description: '挪威传奇效果图工作室，以其独特的自然感与艺术性著称。' },
      { id: 'u1', category: '实用工具', title: 'PDF24', url: 'https://tools.pdf24.org', description: '免费且易用的在线PDF处理工具箱。' },
      { id: 'u2', category: '实用工具', title: 'iLovePDF', url: 'https://www.ilovepdf.com', description: '全能的PDF在线转换和编辑工具。' },
      { id: 'u3', category: '实用工具', title: 'FreeMyPDF', url: 'https://www.freemypdf.com', description: '在线移除PDF文件的密码和编辑限制。' },
      { id: 'u4', category: '实用工具', title: 'Palette.fm', url: 'https://palette.fm', description: 'AI黑白照片上色工具，效果惊艳。' },
      { id: 'u5', category: '实用工具', title: 'BgSub', url: 'https://bgsub.cn', description: '基于AI的自动消除背景工具，无需上传图片。' },
      { id: 'u6', category: '实用工具', title: '扣扣图', url: 'https://www.koukoutu.com', description: '免费在线抠图工具。' }
    ];
  }

  private seedArchipediaData() {
    // [Category, Subcategory, Term, English, Definition, Details]
    const rawData: string[][] = [
      // 1. 中国古代建筑 (Preserving 177 terms from previous turn)
      ['中国古代建筑', '著名实例', '安济桥', 'Anji Bridge', '位于河北省赵县城南，跨于洨河之上，俗称赵州桥。', '这座桥是隋匠李春主持建造的，建于隋大业年间，距今已近 1400 年。安济桥是世界上最早出现的敞肩拱桥。'],
      ['中国古代建筑', '大木作·构件', '昂', 'Ang', '斗拱中的构件，结构上为斜向悬臂梁，斜向下垂的构架。', '起杠杆作用。'],
      ['中国古代建筑', '大木作·构件', '抱头梁', 'Baotou Beam', '抱头梁长一步架，承担一个檩子的力。', '在檐口处的梁，有斗栱时叫挑尖梁，无斗栱时叫抱头梁。'],
      ['中国古代建筑', '大木作·铺作', '补间铺作', 'Intercolumnar Bracket Set', '位于两柱间额枋上的斗拱，称“补间铺作”。', '宋式外檐斗拱根据位置的不同，分为 3 种。柱头上的称“柱头铺作”，角柱上的称“转角铺作”。起到支撑屋檐重量和加大出檐深度的作用。通常当心间用 2 朵，其他次、梢间各用一朵，尽量分布大体匀称。清式建筑中称补间铺作为平身科。由于清式建筑的斗拱的结构的蜕化，比例缩小，装饰性加强，补间铺作由宋式的一到两朵增加到了四到六朵。'],
      ['中国古代建筑', '彩画', '包袱', 'Baofu (Bundle)', '清代苏式彩画中的一种枋心形式。', '其特点是把檐檩、檐地板、檐枋联成一体。包袱边缘用折叠的退晕曲线，称为烟云，可加强图案的立体感与透视感，模糊了界限的边缘。包袱心内可画山水、人物、翎毛、花卉、楼台、殿阁等画题。包袱的运用，使得苏式彩画不同于殿式彩画的程式化，画题都是写实的非程式化的，有意模糊界限，呈现出欢乐活泼快乐的性格，赋予了苏式彩画变通，风趣丰美的格调，著名实例如北京颐和园的长廊等。'],
      ['中国古代建筑', '石作', '抱鼓石', 'Drum Stone', '一般位于宅门入口、形似圆鼓的两块人工雕琢的石制构件，是“门枕石”的一种。', '清代勾阑中与石栏杆配套的构件，采用“抱鼓”的形象可灵活适应不同的地栿坡度，是很有创意的设计。用于栏杆结束处，阻住栏杆不使他掉下来。另为优美形象，作为栏杆的尽端处理，抱鼓石分件少，体现了清式勾阑相比宋式勾阑更加庄重、稳定、强劲的风格。'],
      ['中国古代建筑', '现代理论', '北京宪章', 'Beijing Charter', '1999年国际建筑师协会第20届大会通过的纲领性文献。', '《北京宪章》这一宪章被公认为是指导二十一世纪建筑发展的重要纲领性文献，标志着吴良镛的广义建筑学与人居环境学说，已被全球建筑师普遍接受和推崇，从而扭转了长期以来西方建筑理论占主导地位的局面。宪章总结了百年来建筑发展的历程，并在剖析和整合 20 世纪的历史与现实、理论与实践、成就与问题以及各种新思路和新观点的基础上，展望了 21 世纪建筑学的前进方向。面临新的时代，宪章提出了新的行动纲领：变化的时代，纷繁的世界，共同的议题，协调的行动。'],
      ['中国古代建筑', '陵墓', '宝城宝顶', 'Baocheng Baoding', '用砖石砌筑成圆形或者长圆形的城墙，里面垒土封顶，使之明显突出。', '常见于明十三陵、清东西陵。'],
      ['中国古代建筑', '大木作·度量', '步', 'Bu (Step)', '木构建筑屋架上相邻槫（清称檩）之间中心线的距离。', '各步距离总和或侧面各开间宽度的总和称为“通进深”，简称为“进深”。2.清代各步距离相等，宋代有相等的，递增或递减以及不规律排列的。'],
      ['中国古代建筑', '结构体系', '穿斗式', 'Chuandou Construction', '用穿枋把柱子串联起来，形成一榀榀的房架，檩条直接搁置在柱头上。', '我国木构架建筑结构体系之一，在沿檩条方向，再用斗枋把柱子串联起来，由此形成一个整体的框架。有疏檩和密檩两种做法，疏檩的柱子直接落在地上，密檩是不完全的梁柱支撑。尽量用竖向的木柱来取代横向的木梁，尽量用小材取代大材，简化屋面构造，简化屋檐的悬挑构造。用于用材小，整体性强的建筑。穿斗式木构架主要用于南方，因其不能适应较大空间，所以不用于官式建筑中。它具有灵活性，与抬梁式木构架形成了良好的互补机制。'],
      ['中国古代建筑', '大木作·构造', '侧脚', 'Cejiao (Batter)', '宋式建筑大木作构造手法，柱头向内收进。', '《营造法式》规定：外檐柱在前后檐方向上向内倾斜柱高的千分之十，在两山方向上向内倾斜柱高的千分之八，而角柱则同时在两个方向向建筑内部倾斜，从而把建筑物的一圈檐柱柱脚向外抛出，柱头向内收进，能够借助屋顶重量产生水平推力，增加木构架的内聚力，以防散架或倾侧。此法施工较为麻烦，所以明代以后逐渐减弱，最后废弃不用，代之以增加穿枋和改进榫卯等办法来保持木构架的稳定性。'],
      ['中国古代建筑', '大木作·构造', '叉柱造', 'Chazhu Construction', '上层檐柱柱脚十字或一字开口，叉落在下层平坐铺作中心。', '宋式大木作构造术语。汉族楼阁式建筑中，上层檐柱柱脚十字或一字开口，叉落在下层平坐铺作中心，柱底置于铺作栌斗斗面之上。这种结构方法称叉柱造或插柱造。叉柱造可以增强上下层之间的联系，加强整个构架的稳定性。天津蓟县独乐寺内的观音阁，其上、下柱的交接就采用叉柱造的构造方式。'],
      ['中国古代建筑', '大木作·构造', '缠柱造', 'Chanzhu Construction', '平座檐柱与下屋檐柱交接时，上柱向内收进约半个柱距，其下端不开口，直接置于梁上。', '宋式大木作构造术语。汉族楼阁式建筑中，平座檐柱与下屋檐柱交接时，上柱向内收进约半个柱距，其下端不开口，直接置于梁上。这种结构方法称缠柱造。缠柱造可以增强上下层之间的联系，加强整个构架的稳定性。山西应县佛宫寺释迦塔上层暗层檐柱移下层檐柱收半柱径，其交接方式为缠柱造。在外观上形成逐层向内递收的轮廓。'],
      ['中国古代建筑', '大木作·构件', '草栿', 'Rough Beam', '指在平闇上看不见的栿，制作粗略。', '中国古代建筑梁的形制之一，与明栿相对而言，指在平闇上看不见的栿，由于看不见，所以制造粗略，未经任何艺术加工，制作潦草，故称之为草栿．为宋式梁栿名称，草栿负荷屋盖重量。草栿的粗糙做法与明栿的精致做法形成了良好的互补机制。'],
      ['中国古代建筑', '模数制', '材分制', 'Cai-Fen System', '宋代李诫的著作《营造法式》所提出建立的模数制。', '“材”是模数的基本单位，“分”则是由材进一步细分。《法式》规定，“材有八等，度屋之大小因而用之”。这样，设计房屋只要选定建筑的等级及其开间数，就选定了用哪等材，从而确定大木构件的具体尺寸，对建立规范、把握比例尺度、简化设计工作、方便工料预算、便于构件预制和加快施工速度都有重要作用。材分制度在唐时已有应用，是我国古代匠人智慧的结晶。'],
      ['中国古代建筑', '屋顶与瓦石', '鸱尾', 'Chiwei', '汉至宋宫殿屋脊两端之装饰。', '汉时方士称，天上有鱼尾星，以其形置于屋上可防火灾。遂有鱼尾脊饰。唐代时鸱尾无首，宋代有首，有吻。明清时鱼尾仅在南方建筑中存在，官式建筑则用吻兽。'],
      ['中国古代建筑', '装修与空间', '彻上明造', 'Cheshangmingzao', '建筑物室内的顶部天花不做装饰，让屋顶梁架结构完全暴露。', '如天花不做装饰，更不用藻井，而让屋顶梁架结构完全暴露，使人在室内抬头即能清楚地看见屋顶的梁架结构，称为“彻上明造”，也称“彻上露明造”。在中国古代建筑中多用于厅堂式建筑，如山西太原晋祠圣母殿就采用此法，使得殿内空间非常完整、高敞。'],
      ['中国古代建筑', '城市与规划', '曹魏邺城', 'Ye City of Cao Wei', '中国已知最早的轮廓方正的都城。', '三国时期的曹魏邺城采用了棋盘式的布局，是中国已知最早的轮廓方正的都城。'],
      ['中国古代建筑', '大木作·构件', '叉手', 'Chashou', '支撑在侏儒柱两侧的木构件。', '是朱式建筑构件名称。在抬梁式构架中，从最上一层短梁到脊“槫”（即脊檩）之间斜置的木件，称为“叉手”。叉手的主要作用就是扶持脊“槫”。在唐代及唐代之前，抬梁式木构架中只有叉手而不用蜀柱，宋代时则将叉手与蜀柱并用，而明清时则不用。'],
      ['中国古代建筑', '装修与空间', '抄手游廊', 'Chaoshou Corridor', '中国传统建筑中走廊的一种常用形式，多见于四合院中。', '与垂花门相衔接。一般抄手游廊是进门后先向两侧，再向前延伸，到下一个门之前又从两侧回到中间。在院落中，抄手游廊沿着院落的外缘布置，是开敞式附属建筑，既可供人行走，又可供人休憩小坐，观赏院内景致。'],
      ['中国古代建筑', '装修与空间', '垂花门', 'Chuihua Gate', '位于宅院内部，通常处在二门的位置，是内外院的界限。', '北京四合院的重要组成部份，是内宅与外宅（前院）的分界线和唯一通道。因其檐柱不落地，垂吊在屋檐下，称为垂柱，其下有一垂珠，通常彩绘为花瓣的形式，故被称为垂花门。'],
      ['中国古代建筑', '大木作·构件', '重檐金柱', 'Double-eave Gold Column', '用于重檐建筑的金柱，采用一木做成。', '其下半段为金柱，上半段支承上层檐，故称重檐金柱。'],
      ['中国古代建筑', '结构体系', '殿堂型构架', 'Diantang Structure', '宋《营造法式》中显示出的一种构架形式，与厅堂型相对而言。', '全部构架按水平方向分为柱网层、铺作层、屋架层，自下而上，逐层叠垒而成。柱网层由外檐柱和屋内柱组成，铺作层由搁置在外檐柱和屋内柱柱网之上的铺作组成，屋架层由层层草栿、矮柱、蜀柱架立，殿堂型构架的平面均为整齐的长方形，定型为 4 种分槽形式。佛光寺大殿采用此法。显示了我国古代匠人的智慧。'],
      ['中国古代建筑', '模数制', '斗口', 'Doukou', '清代《工程做法》所提出确定的模数单位。', '斗口是斗上用以插放栱、翘、昂、枋的开口。作为标准单位的斗口，指平身科斗拱中，大斗或十八斗迎面方向安装翘昂的斗口宽度。清代斗口即宋代的材宽，以斗口制取代材分制是对模数制的重要改进。一是以单一的斗口取代材、栔、分的三级划分，减少换算程序。二是以斗口的 11 等取代材分的 8 等，划分更为细密。三是斗口以半斗口为级差，便于估算和施工。其标准化，定型化达到了十分缜密的程度，是我国古代匠人智慧的结晶。'],
      ['中国古代建筑', '彩画', '殿式彩画', 'Palace Style Painting', '梁思成先生把和玺彩画和旋子彩画合称为殿式彩画。', '主要用于宫殿、坛庙、陵寝、寺庙的主建筑。分为藻头、箍头和枋心三个部分。和玺彩画以龙为母题，以蓝绿为主色调，旋子彩画以旋子为母题，用色为蓝绿点金。殿试彩画图案布局严格，整个画面强调出规整，端庄，凝重的格调。'],
      ['中国古代建筑', '民居', '碉楼', 'Diaolou', '主要分布地带是：西康、青藏高原、内蒙古。', '碉楼住宅与山地特殊的地理环境有关，这些地区多山，且石为板岩或片麻岩构造，易剥落加工，取石方便。碉楼外墙为厚实高大的收分石墙楼层，内为密梁木楼层的楼房，楼面用土面层，即在木梁上密铺楞木，再铺一层细树枝，其下再铺20cm的拍石土层。'],
      ['中国古代建筑', '大木作·构件', '劄牵', 'Zhaqian', '又称单步梁，抱头梁，用于无斗拱建筑廊间，承接檐檩的梁。', '用于无斗拱建筑廊间，承接檐檩的梁。'],
      ['中国古代建筑', '平面布局', '分心槽', 'Fenxin Cao', '以一列中柱及柱上斗栱将殿身划分为前后相同的两个空间。', '分心斗底槽的简称，宋代殿阁内部四种空间划分方式之一，一般用作殿门。'],
      ['中国古代建筑', '平面布局', '副阶周匝', 'Funjiezhouza', '殿身内有一圈柱列与斗拱，将殿身空间划分为内外两层空间组成。', '宋代殿阁内部四中空间（单槽、双槽、分心槽、金厢斗底槽）划分方式之一。其特点是殿身内有一圈柱列与斗拱，将殿身空间划分为内外两层空间组成，外层环包内层。实例：山西五台山佛光寺大殿。'],
      ['中国古代建筑', '大木作·构件', '飞橼', 'Flying Rafter', '为了增加屋檐挑出的深度，在原有圆形断面的檐椽外端，还要加钉一截方形断面的椽子。', '在大式建筑中，这段方形断面的椽子就叫做“飞椽”，也叫“飞檐椽”，宋代时称“飞椽”为“飞子”。飞椽的长短自然是随着出檐深度的需要而定。'],
      ['中国古代建筑', '大木作·构件', '扶脊木', 'Fuji Wood', '其位置在脊檩之上，与其长度相当，断面一般为六角形，用以承托脑椽的上端。', '清代建筑结构构件，在其前后朝下的斜面上做出一排小洞，用以承托脑椽的上端。这段横木即称为扶脊木。扶脊木对稳定木构架体系起到了很大作用，也是区分官式建筑中大式建筑与小式建筑的标志。'],
      ['中国古代建筑', '彩画', '枋心', 'Fangxin', '清式彩画梁枋中段，长度约占梁枋的三分之一。', '清式彩画的布局是将梁枋均分为 3 段：中断即为枋心，长度约占梁枋的三分之一，左右两端的端头作箍头，枋心与箍头之间为藻头，在和玺彩画中，枋心与藻头用“圭线”“岔口线”相隔，枋内彩画以龙为母题，以蓝绿为主色调。在旋子彩画中，分为空枋心，一字枋心，锦枋心等，在苏式彩画中，枋心有用于檐梁架的狭长枋心，还有把檐檩、檐垫板联成一体的“包袱”枋心，内可画各种画题。'],
      ['中国古代建筑', '陵墓', '方上', 'Fangshang', '在地宫之上用土层层夯筑，使之成为一个上小下大的尖锥体。', '锥体的上部好像截去尖顶成一房顶，故名之为方上。（秦始皇陵）。'],
      ['中国古代建筑', '彩画', '勾丝咬', 'Gousiyao', '是清式旋子彩画的一种处理方式，是最短的藻头画法。', '也称“狗撕咬”。是将标准的一整二破旋子图案咬紧并连成一片，即在藻头里画三个半旋子。藻头部分短而高时可单独使用。若构件过长，安排一整二破图案后仍有余地，也可插入“勾丝咬”即一整二破加勾丝咬，它是旋子彩画的重要构成元素。反映出清式旋子彩画规整，端庄，凝重的格调。'],
      ['中国古代建筑', '彩画', '箍头', 'Gutou', '清式彩画中，将梁枋均分成 3 段，左右两端的端头作箍头。', '箍头中“合子”和两侧的箍头线组成，用圭线、圭线光与藻头相隔。其主题各不相同：和玺彩画箍头合子里画坐龙；旋子彩画箍头可以作坐龙、西番莲、旋子；苏式彩画箍头将檩、垫、枋连成一体，多用连续回纹或万字纹，旁带连珠纹贯通上下。'],
      ['中国古代建筑', '营造技艺', '过白', 'Guobai', '后栋建筑与前栋建筑的距离要足够大，使坐于后进建筑中的人通过门樘可以看到前一进的屋脊。', '即在阴影中的屋脊与门樘之间要看得见一条发白的天光，此做法称之为“过白”。'],
      ['中国古代建筑', '建筑师', '关颂声', 'Guan Songsheng', '基泰工作室创始人，它是我国创办较早、影响最大的建筑设计事务所。', '后杨廷宝加入其中，其代表作品有：沈阳的京奉铁路总站（今沈阳火车站）和东北大学校舍、南京的中央运动场（今南京体育学院）、中山陵音乐台等。'],
      ['中国古代建筑', '石作', '勾阑', 'Goulan', '宋代时对栏杆的称呼，由望柱，寻杖，阑板组成，结束处常设有抱鼓石。', '由望柱，寻杖，阑板组成，结束处常设有抱鼓石。'],
      ['中国古代建筑', '彩画', '和玺彩画', 'Hexi Painting', '清式殿式彩画中的一种形式，级别最高。', '主要用于宫殿、坛庙、陵寝的主体建筑。其布局是将梁枋均分为 3 段，中段为枋心，左右两端作箍头，箍头与枋心之间的部分称为藻头。其特点是以龙为母题，定型为行龙，坐龙，升龙和降龙四种图案。以蓝绿色为基调，用色原则是左右蓝绿相间，上下蓝绿对调。其图案都是程式化的，图案化的，变形的画题。严格运用平面图案，排除立体感和透视感，保持构件载体的二维平面视感。图案的分布严格遵循界限，绝不超越、交混。从而强调出规整，端庄，凝重的格调。体现了封建社会森严的等级制度。'],
      ['中国古代建筑', '陵墓', '黄肠题凑', 'Huangchang Ticou', '西汉帝王陵寝椁室四周用柏木堆垒成的框形结构。', '“黄肠题凑”一名最初见于《汉书·霍光传》。根据汉代礼制，黄肠题凑与梓宫、便房、外藏椁、金缕玉衣等同属帝王陵墓中的重要组成部分，经朝廷特赐，个别勋臣贵戚才可以使用。黄肠是指黄心的柏木，即堆垒椁室所用的柏木、枋木心色黄。题凑是指枋木的端头皆指向内，即四壁所垒筑的枋木与同侧椁室壁板面呈垂直方向。该类型墓穴的代表有秦公一号大墓、天山汉墓、广阳王刘建与王后合葬墓。'],
      ['中国古代建筑', '建筑师', '黄作燊', 'Huang Zuoshen', '国内第二代建筑师，圣约翰建筑系系主任，和贝聿铭同为建筑大师格罗皮乌斯学生。', '国内第二代建筑师，圣约翰建筑系系主任，和贝聿铭同为建筑大师格罗皮乌斯学生。'],
      ['中国古代建筑', '建筑师', '华盖事务所', 'Allied Architects', '由赵深，陈植，童寯三人于1933年在上海组合成立，三人均从美国宾夕法尼亚大学毕业。', '由赵深，陈植，童寯三人于1933年在上海组合成立，三人均从美国宾夕法尼亚大学毕业。'],
      ['中国古代建筑', '园林', '花街铺地', 'Huajie Paving', '明清时期江南一带的室外铺地手法，利用各种建筑废料组成多种构图，及经济又实用。', '明清时期江南一带的室外铺地手法，利用各种建筑废料组成多种构图，及经济又实用。'],
      ['中国古代建筑', '平面布局', '金厢斗底槽', 'Jinxiang Doudi Cao', '殿身内有一圈柱列与斗拱，将殿身空间划分为内外两层空间组成。', '宋代殿阁内部四中空间（单槽、双槽、分心槽、金厢斗底槽）划分方式之一。其特点是殿身内有一圈柱列与斗拱，将殿身空间划分为内外两层空间组成，外层环包内层。实例：山西五台山佛光寺大殿。'],
      ['中国古代建筑', '大木作·构件', '金柱', 'Jin Column (Gold Column)', '位于檐柱内侧的柱子，多用于带外廊的建筑。', '金柱又是除檐柱中柱和山柱以外的柱子的通称，依位置不同可分为外金柱和内金柱。'],
      ['中国古代建筑', '大木作·构件', '角柱', 'Corner Column', '位于建筑四角的柱子。', '位于建筑四角的柱子。'],
      ['中国古代建筑', '度量', '间', 'Bay', '中国古代木构架建筑把相邻两榀屋架之间的空间称为间。', '房屋进深则用架来表示。这种用几间几架来表示建筑模数的方式，一直沿用到明清。'],
      ['中国古代建筑', '营造技艺', '卷杀', 'Entasis', '宋代栱、梁、柱等构件端部作弧形（其轮廓由折线组成），形成柔美而有弹性的外观。', '称为卷杀。体现了古代匠人对建筑美学上的考量。'],
      ['中国古代建筑', '大木作·构件', '角背', 'Jiaobei', '明清大式建筑中保持瓜柱稳定的辅助构件。', '一般在大式房屋上用的较多。木构架中，凡是瓜柱都有角背支撑以免倾斜。大式建筑可有角背，小式建筑没有角背。它是明清建筑形制体系高度成熟化的反映，也体现了古代匠人的智慧和精湛的技艺。'],
      ['中国古代建筑', '屋顶与瓦石', '九脊顶', 'Nine-ridge Roof', '宋代歇山建筑的一种称谓，用于亭榭、厅堂。', '歇山顶是两边带半截“撒头”的不完全四坡顶，由正脊、四条垂脊、四条戗脊组成，故称九脊殿，加上山面上的两条博脊共 11 条。有单檐、重檐的形式，呈现出丰美、华丽、丰富的性格。它体现了宋代建筑体系的制度化、精致化，以及古代匠人精湛的技艺。'],
      ['中国古代建筑', '石作', '减地平钑', 'Jiandipingsa', '宋代《营造法式》中定出的四种雕镌形式之一。', '它是一种平板式的浮雕，地下凹在一平面上，母题凸起的表面也是一个平面。'],
      ['中国古代建筑', '屋顶与瓦石', '剪边', 'Jianbian', '指屋顶的脊和边用琉璃，其余用瓦的做法。', '实例见于河北正定隆兴寺摩尼殿。'],
      ['中国古代建筑', '建筑类型', '经幢', 'Sutra Pillar', '柱身上镌刻经文，宣扬佛法的纪念性石柱建筑物。', '经幢一般有基座，幢身，幢顶三部分。'],
      ['中国古代建筑', '陵墓', '集中陵制', 'Centralized Mausoleum System', '陵墓集中布置，共用一条神道。', '典型实例，北京昌平明十三陵。'],
      ['中国古代建筑', '大木作·构造', '举架', 'Jujia', '清代大屋顶的构造做法，其举高通过歩架求得。', '清代大屋顶的构造做法，其举高通过歩架求得。'],
      ['中国古代建筑', '园林', '计成', 'Ji Cheng', '明末造园家和造园理论家，著有在中国园林史上机具影响力的《园冶》。', '明末造园家和造园理论家，著有在中国园林史上机具影响力的《园冶》。'],
      ['中国古代建筑', '大木作·构造', '举折', 'Juzhe', '举指屋架的高度，常按建筑的进深与屋面材料而定。宋称--举折。', '所谓举架是指，木构架相邻两檩中的垂直距离除以对应步架长度所得的系数。作用，使屋面呈一条凹形优美的曲线。越往上越陡，利于排水和采光。'],
      ['中国古代建筑', '工官', '蒯祥', 'Kuai Xiang', '明代工官，主持修建北京皇宫及明长陵。', '明代工官，主持修建北京皇宫及明长陵。'],
      ['中国古代建筑', '文献', '园冶', 'Yuanye (The Craft of Gardens)', '为明代计成所著，是中国第一本园林艺术理论专著。', '共三卷，卷一的“兴造论”和“园说”是全书立论所在。该书精华可归纳为“虽由人作，宛若天开”“巧于因借，精在体宜”。'],
      ['中国古代建筑', '工官', '将作', 'Jiangzuo', '汉代以后对中国最高工官的称呼，又被称为“将作少府”“将作大匠”“将作监”等等。', '汉代以后对中国最高工官的称呼，又被称为“将作少府”“将作大匠”“将作监”等等。'],
      ['中国古代建筑', '度量', '开间', 'Kaijian (Bay)', '木构建筑正面相邻两檐柱之间的水平距离称为“开间”（又叫“面阔”）。', '开间宽度的总和称为通面阔。开间在汉代以前有奇数也有偶数，汉以后多用十一以下的奇数。民间建筑常用三，五开间；宫殿庙宇官署多用五，七开间，十分重要的用九开间。至于十一开间。正中一间称为明间（宋称当心间），之后分别为次间，梢间，尽间；九开间以上的增加次间数。在宋代建筑遗物和营造法式中，各间面阔有相等的；有当心间稍宽，次间稍窄的；也有各不均匀的。'],
      ['中国古代建筑', '彩画', '卡子', 'Kazi', '清式苏式彩画中的一种画法。位于藻头部位的檩、垫、枋上。', '做法有三种：全部贴金，金琢墨沥粉退晕和烟琢墨染香紫缘三色。若垫板固定为红地仗，画软卡子，檩枋则在蓝地仗上画硬卡子。绿地仗画软卡子。卡子与包袱之间随宜画花卉和枋心集锦。苏式彩画主要用于园林建筑中，具有变通、风趣、丰富的格调。反映出轻松，活泼，欢快的性格。'],
      ['中国古代建筑', '文献', '考工记', 'Kaogongji', '出自《周礼》，是中国第一部工科巨著，也是我国古代城市规划理论最早最权威的一部著作。', '是春秋战国时期记述官营手工业各工种规范和制造工艺的文献，提出了我国城市，特别是都城的基本规划思想和城市格局。'],
      ['中国古代建筑', '大木作·构件', '阑额', 'Lan\'e (Architrave)', '清称额枋，是柱上联络与承重的水平构件。', '南北朝及以前多置于柱顶，隋唐以后才移到柱间。有时为两根并用，上面一根叫大额枋，宋称阑额。下面一根叫小额枋，宋称由额。两者之间使用垫板，宋称额垫枋。在内柱中使用的额枋称为内额，位于柱脚处的类似木结构。'],
      ['中国古代建筑', '文献', '木经', 'Mu Jing (Timberwork Manual)', '为宋代喻皓所著，是我国第一部木结构建筑手册，对营造法式有很强的参考价值，现已失传。', '为宋代喻皓所著，是我国第一部木结构建筑手册，对营造法式有很强的参考价值，现已失传。'],
      ['中国古代建筑', '石作', '慢道', 'Mandao', '以砖石露棱侧砌筑的斜坡道，又称礓石察。', '高长比一般为1：4，可做成几个斜面组合的形式，称三瓣蝉翼或五瓣蝉翼。'],
      ['中国古代建筑', '机构', '内工部', 'Neigongbu', '清康熙以后在内务府设立的机构，又称营造司。', '承担清代特有的大规模行宫和苑囿建造。'],
      ['中国古代建筑', '石作', '辇道', 'Niandao', '倾度平缓，用以行车的坡道，又称御路。', '常置于两踏跺之间，其上多雕刻云龙水浪，功能逐渐为装饰化所取代。'],
      ['中国古代建筑', '大木作·铺作', '平身科', 'Pingshenke', '清代斗拱名称。是指在两柱之间的阑额上的斗拱。', '宋时称斗拱为铺作，因斗拱所在位置的不同而有不同的名称。平身科的数量，通常当心间为两朵，其他次、梢间各一朵。各平身科之间的间隔大致相等。'],
      ['中国古代建筑', '结构体系', '平坐', 'Pingzuo (Terrace)', '殿堂型构架中的构件，廊台出于建筑主要空间的上层构造。', '在阁层在其下层梁上先立较短的柱和梁、额、斗拱，作为各层的基座，以承托各层的屋身，平坐斗拱上铺设楼板，并置勾阑，做成环绕一周的跳台、高台或楼层用斗拱、枋子、铺板等挑出，以利登临眺望，此结构层称为平坐，如观音阁，体现匠人智慧和精湛的技艺。'],
      ['中国古代建筑', '大木作·构件', '平梁', 'Ping Beam', '又称三架梁，宋式建筑位于脊槫下的梁，长二椽，上承托三檩。', '又称三架梁，宋式建筑位于脊槫下的梁，长二椽，上承托三檩。'],
      ['中国古代建筑', '大木作·铺作', '铺作', 'Puzuo (Bracket Set)', '宋代称为铺作，清代称斗拱。', '狭义上讲，铺作是中国古代汉族木构架建筑特有的结构构件，主要由斗、拱、昂、枋四类构件组成。在结构上承重，承托伸出的屋檐，将屋檐的重量直接或间接地转移到木柱上。同时还有一定的装饰作用。广义上讲，是指斗拱所在的铺作层，是建筑屋顶和屋身立面上的过渡。此外，他还作为封建社会中森严等级制度的象征，作为中国古代木构架的标志性构件具有重要的历史价值。'],
      ['中国古代建筑', '建筑类型', '牌坊', 'Paifang', '一种纪念性的建筑，主要由柱、依柱石、梁、枋、楼等几部分组成。', '它的形式有一间两柱、三间四柱等，也有大者能达到五间、七间的牌坊。柱于之间架有横梁相连。粱的上面承接着镌刻有建坊目的之类文字的枋，枋上建楼，粱与柱相连的拐角处多有雀替，每根石柱前后都有依柱石夹抱。牌坊建在陵墓，祠堂、衙署、园林等处，甚至是街旁、里坊、路口，既可作为种标志，也可用于褒扬功德、辟表节烈等。因此，牌坊分为：标志坊、功德坊和节烈坊。'],
      ['中国古代建筑', '大木作·构件', '普拍枋', 'Pupai Fang', '置于阑额之上用于承托斗栱的构件，清代称平板枋。', '置于阑额之上用于承托斗栱的构件，清代称平板枋。'],
      ['中国古代建筑', '大木作·构件', '雀替', 'Que Ti (Sparrow Brace)', '清式木装修构件名称。宋代称“角替”，又称“插角”或“托木”。', '通常被置于建筑的横材（梁枋）与竖材（柱）相交处，作用是缩短梁枋的净跨度，从而增强梁枋的荷载力；减少梁与柱相接处的向下剪力；防止横竖材间的角度倾斜。其制作材料由该建筑所用的主要建材决定，如木建筑上用木雀替，石建筑上用石雀替。'],
      ['中国古代建筑', '屋顶与瓦石', '戗脊', 'Qiangji', '又名岔脊，是重檐歇山顶自垂脊下端至屋檐部分的屋脊。', '在有不同方向的承梁板的屋顶中，起两个斜屋面交接处所形成的外角。是中国古代歇山顶屋面四条垂脊下，延角梁方向斜出的四条脊，和垂脊称 45°，对垂脊起支撑作用，戗脊上可安放戗兽，以戗兽为界分为兽前和兽后，又根据戗兽的等级象征建筑的等级。重檐屋顶的下层檐的檐角屋脊也是戗脊。'],
      ['中国古代建筑', '石作', '如意踏步', 'Ruyi Steps', '阶梯形踏步中不使用垂带石只用踏跺的做法。', '阶梯形踏步中不使用垂带石只用踏跺的做法。'],
      ['中国古代建筑', '大木作·构件', '乳栿', 'Ru Beam', '又称双步梁，连接金柱和檐柱，一般不起承重作用。', '当廊子过宽时，其上可以加一瓜柱，架梁或桁，这时具有承载功能。'],
      ['中国古代建筑', '大木作·铺作', '双抄双下昂', 'Shuangchao Shuangxia\'ang', '双抄即出两个华棋，双下昂即设两个下昂。', '元代以后注头铺作不用昂，至清代，带下昂的平身科又转化为溜金斗棋的做法,原来斜昂的结构作思丧失殆尽。'],
      ['中国古代建筑', '大木作·构造', '生起', 'Shengqi (Rise)', '宋代木构建筑大木作术语。', '其特点是：屋宇檐柱的角柱比当心间的两柱高 2~12 寸，其余檐柱也依势逐柱升高。因而宋代建筑的屋檐仅当心间为直线段，其余全部为曲线组成。屋脊也因此而用生头木将脊榑的两端垫高，形成曲线，使之与檐口想呼应。其他各榑的生头木则使屋面形成双曲面。清式建筑无角柱生起。'],
      ['中国古代建筑', '大木作·构件', '随梁枋', 'Suiliang Fang', '明清大式建筑中起稳固梁作用的联系构件。', '在内柱之间用枋料加以联结，是最长的梁下的枋，称之为随梁枋。它提高了木构架的稳定性。他是明清建筑形制体系高度成熟化的反映，也体现了古代匠人的智慧和精湛的技艺。'],
      ['中国古代建筑', '屋顶与瓦石', '收山', 'Shoushan', '歇山顶的一种处理手法。', '是歇山屋顶两侧山花自山面檐柱中线方向向内收进的做法，其目的是为了是屋顶不至于庞大，但引起了结构上的某些变化，增加了顺梁，踩步金梁架等。例如南禅寺大殿山面。'],
      ['中国古代建筑', '彩画', '苏式彩画', 'Suzhou Style Painting', '起源于苏州，传入北京后，演变为官式彩画的一种。', '主要用于园林、住房的堂屋、亭榭、门廊、它的枋心有两种形式，一种是用于内檐梁架的狭长枋心，另一种是把檐檩、檐垫板、檐枋联成一体的包袱枋心。包袱心内可随宜画山水、人物、花卉楼台殿阁等画题，都是写实的非程式化的画题。它呈现出的轻松活泼欢乐的性格具有变通丰富丰美的格调。'],
      ['中国古代建筑', '历史', '舍宅为寺', 'Donating Residence as Temple', '佛教建筑发展的重要动因之一。', '即士族，富商将自己的家宅捐为佛寺，是当时市井寺庙的重要源头。这一时期最具有代表性的佛教建筑是北魏洛阳的永宁寺；以及河南登封嵩岳寺塔，这是我国现存最早的佛塔。'],
      ['中国古代建筑', '著名实例', '神通寺四门塔', 'Four Gates Pagoda', '山东历城神通寺四门塔建于隋大业年间，是我国现存最早的亭阁式塔。', '塔身单层，平面方形，四面各辟一半圆拱门。'],
      ['中国古代建筑', '近代建筑', '上海沙逊大厦', 'Sassoon House', '20世纪20年代英国新沙逊洋行投资兴建的一座“装饰艺术”风格的建筑。', '1872年，英籍犹太人伊利亚斯·沙逊在孟买成立新沙逊洋行，后来上海开设分行。1929年9月落成新楼。大楼19米高的墨绿色金字塔形铜顶是外滩的一个显著标志。其设计者是著名的公和洋行。底层西大厅和4～9层开设当时上海的顶级豪华饭店华懋饭店，有9个国家风格的客房，底层东大厅租给荷兰银行和华比银行，顶楼是沙逊自己的豪华住宅。1952年，上海市政府接管该楼。1956年作为和平饭店开放。1965年，外滩19号原汇中饭店并入，分别称为和平饭店北楼和南楼。1992年世界饭店组织将和平饭店列为世界著名饭店。'],
      ['中国古代建筑', '民居', '三间四耳倒八尺', 'Three Bays Four Ears', '云南“一颗印”民居的最典型格局。', '“三间四耳”指其正房、耳放毗连，正房为三开间，而左右各有两间耳放；倒八尺指居中的大门内所设的倒座深八尺。'],
      ['中国古代建筑', '理念', '尚祖制', 'Respect for Ancestral Systems', '对祖制的尊奉。', '这种对祖制的尊奉，使得营造过程长期处于沿袭前代技巧而少有突破的状态。'],
      ['中国古代建筑', '屋顶与瓦石', '水戗发戗', 'Shuiqiang Faqiang', '清代南方苏州一代房屋翼角的处理方法，此类方法还有嫩戗发戗。', '水戗发戗檐口比较平直，仔角梁基本不起翘。起翘的是戗脊，戗脊在屋角处脱离屋面，像象鼻一样伸出去。这样的构造相比嫩戗发戗来说简单得多。'],
      ['中国古代建筑', '制度', '三朝五门', 'Three Courts Five Gates', '古代帝王宫殿布局制度。', '东汉郑玄注《礼记·玉藻》曰:“天子及诸侯皆三朝”︰外朝一，内朝二;又注《礼记。明堂位》曰:天子五门，皋、库、雉、应、路”、“诸侯三门”。这就是“三朝五门”的由来。'],
      ['中国古代建筑', '建筑类型', '窣堵波', 'Stupa', '古代佛教特有的建筑类型之一，佛塔的前身。', '主要用于供奉和安置佛祖及圣僧的遗骨（舍利)、经文和法物，外形是一座圆冢的样子，也可以称作佛塔。'],
      ['中国古代建筑', '大木作·构件', '山柱', 'Gable Column', '位于建筑山墙面的柱子。', '位于建筑山墙面的柱子。'],
      ['中国古代建筑', '工官', '司空', 'Sikong', '自周至汉，对中国最高工官的称呼。', '据司马迁解释司空“主司空土以居民”，因而可认为是由于主管人居空间而得名。'],
      ['中国古代建筑', '大木作·构件', '蜀柱', 'Shu Column', '又称侏儒柱，瓜柱，立于梁上，最早只用于脊槫下。', '又称侏儒柱，瓜柱，立于梁上，最早只用于脊槫下。'],
      ['中国古代建筑', '结构体系', '厅堂型构架', 'Tingtang Structure', '宋《营造法式》中显示出的一种构架形式，与殿堂型相对而言。', '厅堂型属于梁架分缝做法，内柱高于外柱，没有定型的平面，厅堂型构架的做法大为简化，显示出勃勃的生命力，斗拱分散于柱梁与外檐的节点，结构功能衰退，明清的抬梁式构架就是在厅堂型构架的基础上进一步发展的。南禅寺大殿、善化寺三圣殿均采用此法。显示了我国古代匠人的智慧。'],
      ['中国古代建筑', '结构体系', '抬梁式', 'Tailiang Construction', '柱头上搁置梁头，梁头上搁置檩条，梁上再用短柱支起较短的梁，如此层叠而上。', '我国木构架建筑结构体系之一，梁的总是可达 3~5 根。当柱上采用斗拱时，则梁头搁置在斗拱上。这种木构架多用于北方地区及宫殿、庙宇等规模较大的建筑物。'],
      ['中国古代建筑', '屋顶与瓦石', '推山', 'Tuishan', '是庑殿建筑处理屋顶的一种特殊手法，用于屋檐进深较大，正脊较短的建筑。', '由于立面上的需要，将正脊向两端推出，从而四条垂脊由 45°斜直线变为柔和曲线，并使屋顶正面和山面的坡度与步架距离都不一致，推山的运用，使庑殿顶呈现出宏大、伟壮的性格，是正式屋顶中等级最高的。此法在《营造法式》中已有规定，但至宋、辽迄明，建筑中有用有不用的，到清代才成为定形。'],
      ['中国古代建筑', '石作', '剃地起凸', 'Tidiqitu', '剔地凸起是宋代《营造法式》定出的四种雕镌形式之一。', '其他三种为压地隐起，减地平钑和素平。所谓剔地起突，就是高浮雕、半圆雕、母体凸出，石面较高，起伏大，层次多。如北京故宫太和殿御路石刻中的龙纹即为剔地起突。它的出现，体现了宋代建筑精致化的特点。'],
      ['中国古代建筑', '陵墓', '唐乾陵', 'Qianling Mausoleum', '唐高宗李治与武则天的合葬墓。', '建筑群处理日益成熟，宫殿、陵墓建筑加强了突出主体建筑的空间组合，强调了纵轴方向的陪衬手法，最典型的例子是唐乾陵。唐乾陵因山为陵，以墓前双峰为阕，再以二者之间依势上升的的地段为神道，神道两侧排列门阙、石柱、石兽、石人等，用以衬托主体建筑，花费少而收效大。'],
      ['中国古代建筑', '大木作·构件', '童柱', 'Tong Column', '放在横梁上，下端不着地，将上一层梁垫起，使之达到需要的高度的木块。', '放在横梁上，下端不着地，将上一层梁垫起，使之达到需要的高度的木块。'],
      ['中国古代建筑', '建筑类型', '坛庙', 'Altar and Temple', '坛庙出现起源于祭祀，祭祀是对人们向自然、神灵、鬼魂、祖先、繁殖等表示一种意向的活动仪式的通称。', '第一类祭祀自然神，其建筑包括天地日月风雨雷电社稷先农之坛，五岳五镇四海四渎之妙等。第二类是祭祀祖先。帝王祖庙称太庙，臣下称家庙或祠堂第三类是先贤祠庙，如孔子庙、诸葛武侯祠、关帝庙。'],
      ['中国古代建筑', '建筑师', '童寯', 'Tong Jun', '建筑五宗师之一，致力于中国式建筑设计理论探索和中国古典园林研究。', '曾加入华盖建筑事务所，并任教于南京大学，南京工学院多年，与刘敦桢杨廷宝共同塑造了建筑教育的“中大体系”和“南工风格”，代表作品有《江南园林志》。'],
      ['中国古代建筑', '机构', '基泰工程司', 'Kwan, Chu and Yang', '由关颂声于1920年在天津成立，朱彬和杨廷宝先后加入。', '由关颂声于1920年在天津成立，朱彬和杨廷宝先后加入。'],
      ['中国古代建筑', '民居', '坞壁', 'Wubi (Fortress)', '坞壁即平地建坞，围墙环绕，前后开门，坞内建望楼，四隅建角楼，略如城制。', '坞壁即平地建坞，围墙环绕，前后开门，坞内建望楼，四隅建角楼，略如城制。'],
      ['中国古代建筑', '屋顶与瓦石', '庑殿顶', 'Hip Roof', '庑殿顶是“四出水”的五脊四坡式，由一条正脊和四条垂脊（一说戗脊）共五脊组成，因此又称五脊殿。', '由于屋顶有四面斜坡，故又称四阿顶。古代建筑的一种屋顶样式。在中国是各屋顶样式中等级最高的，一般用于宫殿、庙宇。'],
      ['中国古代建筑', '建筑等级', '小式建筑', 'Minor Building', '清代官式建筑的构筑形式之一，属于低等次建筑。', '对比大式建筑，主要用于大式建筑中的辅助用房和宅舍、店肆等一般建筑。为了体现建筑的等级区分，小式建筑不得超过 5 间 7 架，不许用廊，不得带斗拱以及飞椽、扶脊木、角背、随梁枋等构件，其屋顶只能用硬山、悬山以及卷棚做法而不得作重檐。例如北京四合院的厢房属于小式建筑。大式建筑与小式建筑的出现，体现了封建礼制森严的等级制度。'],
      ['中国古代建筑', '屋顶与瓦石', '厦两头', 'Sha Liangtou', '中国古代官式建筑中正式屋顶的四种基本类型之一，即指歇山顶。', '宋代时，歇山顶用于殿阁称为九脊顶，用于亭榭则称为厦两头造。两边带半截“撒头”的不完全四阿顶。它由一条正脊，四条垂脊和四条戗脊组成，分为带正脊的尖山与不带正脊的卷棚做法。凡卷棚就比尖山等级上下降半等，还可以做成重檐，显现出华丽的效果。'],
      ['中国古代建筑', '彩画', '旋子彩画', 'Xuanzi Painting', '清式彩画中殿式彩画的一种形式，等级次于和玺彩画。', '多用于宫殿、坛庙、陵寝的次要建筑和寺庙等组群中的主次建筑。其主要特点是在藻头里画旋子图案，最标准的是画一个整旋子和两个半旋子，称为一整二破。根据藻头长宽比的不同，有 8 种藻头定型格式。旋子彩画的枋心可画成空枋心、一字枋心、锦枋心等。其用色主要为蓝绿点金，与和玺彩画一样，表现出规整、端庄、凝重的格调。'],
      ['中国古代建筑', '园林', '小中见大', 'Seeing Big in Small', '以借景和障景的园林手法，主要是以延长视距/景深和景物间相互屏障或遮障的手法取得的,取得园林边界模糊的效果。', '以借景和障景的园林手法，主要是以延长视距/景深和景物间相互屏障或遮障的手法取得的,取得园林边界模糊的效果。'],
      ['中国古代建筑', '工官', '徐杲', 'Xu Gao', '明代工官，主持重建北京前三殿和西苑永寿宫。', '明代工官，主持重建北京前三殿和西苑永寿宫。'],
      ['中国古代建筑', '石作', '象眼', 'Xiangyan', '台阶侧面的三角形部分，宋代时作层层收叠状。', '台阶侧面的三角形部分，宋代时作层层收叠状。'],
      ['中国古代建筑', '民居', '一明二暗', 'One Bright Two Dark', '一堂二间：又称为“一明两暗”，是木构架建筑开间的布局形式。', '由于受到封建等级限制，低品官和庶人的宅第，正房不得超过三间，所以大多数都采用一堂二内的形式。如北京四合院住宅的正房、厅房、厢房大多数都是“一堂二间”的三开间基本型。这种布局形式反应了封建礼制下的等级观念。'],
      ['中国古代建筑', '彩画', '一整二破', 'Yizheng Erpo', '清式旋子彩画中藻头的 8 中图案之一。', '是在藻头内画一个整旋子和两个半旋子，是标准的旋子图案。分为旋眼，一路瓣，二路瓣。旋子的用色原则与和玺彩画一样，主要为蓝绿色点金，多用于宫殿，坛庙陵寝的次要建筑和寺庙的主要建筑等组群的主次要建筑。一整二破的标准构图反映出殿式彩画二维平面视感与规整端庄凝重的格调。'],
      ['中国古代建筑', '民居', '一颗印', 'Seal-like Compound', '云南“一颗印”是云南中部地区普遍采用的一种住宅形式。', '它由正房、耳房（厢房）和入口门墙围合成正方如印的外观，故得名一颗印。'],
      ['中国古代建筑', '机构', '营缮司', 'Yingshan Si', '明清时期在工部设立的机构，负责朝廷各项工程的营建。', '明清时期在工部设立的机构，负责朝廷各项工程的营建。'],
      ['中国古代建筑', '大木作·构件', '月梁', 'Crescent Beam', '宋代大木作构件的名称。', '唐宋建筑平棊之下的明栿均做成月梁，其做法是将梁的两端加工成下弯的曲线，梁面弧起，形如月牙，梁首、梁尾、梁底有卷杀，梁侧面往往制成琴面并装饰以雕刻，从而取得柔美清秀的效果，丰富了木构架的艺术效果。月梁在汉代称为虹梁，宋称为月梁。明代以后南方地区建筑中尚保留此法，而北方已不用。月梁的使用，体现了宋朝建筑秀美，精致的特点。'],
      ['中国古代建筑', '石作', '压地隐起', 'Yadiyinqi', '宋代《营造法式》中定出的四种雕镌形式之一。', '其他三种为剔地起突，减地平钑和素平。其特征是浅浮雕、地下凹、在一平面，母体凸起，高出石面不多，其最高凸点均在一平面上。雕刻部位有起伏，有深度感。如北京天安门前的汉白玉华表即应用了压地隐起的手法。它的出现，体现了宋朝建筑精致、秀美的特点。'],
      ['中国古代建筑', '彩画', '烟云', 'Yanyun', '清代苏式彩画中的一种彩画形式。', '当彩画中的枋心为包袱枋心时，则可在包袱边缘用折叠的退晕曲线，由此曲线构成的图案即为烟云。包袱心内科随宜画山水、人物、花卉、楼台、殿阁等画题，烟云包袱可做五色粉退晕，每种色彩退晕五道，七道或九道，因烟云采用了退晕的手法，故而强调了彩画的立体感和透视感，使得苏式彩画呈现出轻松、活泼、换了的性格，具有变通、风趣和丰美的格调。'],
      ['中国古代建筑', '工官', '宇文恺', 'Yuwen Kai', '隋代工官，曾主持规划隋大兴城修建。', '隋代工官，曾主持规划隋大兴城修建。'],
      ['中国古代建筑', '工官', '喻皓', 'Yu Hao', '宋代木匠，著有《木经》，为《营造法式》的前身。', '宋代木匠，著有《木经》，为《营造法式》的前身。'],
      ['中国古代建筑', '工官', '样式雷', 'Yangshi Lei', '清代宫廷建筑设计由“样式房“承担，在样式房服设时间最长的当推雷氏家族，人称“样式雷”。', '至今仍留有大量笛氏所做圆明园和清代帝后陵墓的工程图纸、模型和工程说明书。(图纸称“画样”，模型称“烫样”。工程说明书称“工程做法”这是一份非常珍贵的研究清代建筑的档案资料。）'],
      ['中国古代建筑', '大木作·构件', '檐柱', 'Eave Column', '位于建筑物外围的柱子。', '位于建筑物外围的柱子。'],
      ['中国古代建筑', '园林', '苑囿', 'Imperial Garden', '供历代帝王进行起居，骑射，观奇，宴游，祭祀以及召见大臣，举行朝会等各种活动的场地。', '一般在京城周围设置若干个。先秦时多称"囿"，汉多称为"苑"。"苑囿"合称也较为常见。3-苑囿是以园林为主的皇帝离宫，除了布置园景游憩之外，还包括有举行朝贺和处理政务的宫殿以及皇帝、后妃和服务人员的居住建筑、生活供应建筑及庙宇等。汉以前是帝王贵族畋（tián）猎的苑囿为主的时期。'],
      ['中国古代建筑', '陵墓', '因山为陵', 'Mountain as Mausoleum', '利用山丘作为陵墓，把地宫掘进山里去。', '代表实例：唐太宗昭陵、乾陵。'],
      ['中国古代建筑', '建筑师', '杨廷宝', 'Yang Tingbao', '中国建筑史事务所中首屈一指的基泰工程司的建筑设计主要负责人。', '杨延宝的设计灌注了新建筑民族特色，尝试运用大屋顶和点缀传统装饰灯不同的处理手法，设计中善于掌握整体环境，作品表现出洗练凝重的风格。在中国近代建筑界有很高的声誉。其作品有南京中央医院，中山陵音乐台等。'],
      ['中国古代建筑', '机构', '营造学社', 'Society for Research in Chinese Architecture', '中国近代重要的建筑研究团体。由中国私人兴办，朱启钤创立并任社长。', '社员有梁思成、林徽因、刘敦桢等。学社从事古代建筑实例的调查，研究与测绘，以及文献资料耳朵搜集，整理与研究。它对中国传统建筑的研究与保护作用是空前的，发现了许多重要建筑，还培养了一大批优秀人才，出版过大量专著，为中国古代建筑史研究做出重大贡献，奠定了中国建筑学的基石。'],
      ['中国古代建筑', '文献', '营造法式', 'Yingzao Fashi', '为宋代李诫所主持编撰，是我国最完整的古代建筑技术书记。', '收录大量各工种造作规程，技术要求和构建加工方法。'],
      ['中国古代建筑', '大木作·度量', '足材', 'Zucai', '宋代《营造法式》中由单向值的斗口派生出的双向值断面尺寸。', '“一材一栔” 为足材，高 21 分。其中材为斗拱或素方用断面尺寸，高宽比为 3:2,（高 15 分宽 10 分），栔为两层斗拱之间填充的木件断面尺寸，高 6 分宽 4 分，故一足材为 21 分宽 10 分。足材的出现，对于统一建筑标准，建立设计规范，简化设计工作，方便工料预算，便于构件预制，加快施工进度，都起到了重要的作用。'],
      ['中国古代建筑', '装修与空间', '藻井', 'Caisson Ceiling', '常见于汉族宫殿，坛庙建筑中的室内顶棚的独特装饰部分。', '是天花板两种形式之一的平棊的向上凹入的部分，通常位于天花板的核心位置，呈伞盖形，象征天室的崇高。一般用在殿堂明间的正中，如帝王御座、神佛像座上。常见的是八角形的斗八藻井，也有圆藻井。藻井是木构建筑一项繁琐的装饰技术，其设置起到了烘托室内空间的作用。北京故宫太和殿中心的蟠龙藻井是现存藻井中最华贵的。'],
      ['中国古代建筑', '彩画', '藻头', 'Zaotou', '又称为“找头”，清式彩画的布局中，箍头与枋心之间的部位即称为藻头。', '清式彩画的布局是将梁枋均分为 3 段：中段为枋心，左右两端的端头作箍头，箍头由“合子”和两侧的箍头线组成，箍头与枋心之间的部位即称为藻头。在和玺彩画中，藻头与枋心间用“圭线”“岔口线”相隔，用“圭线”“圭光线”与箍头相隔，以龙为画作母题，蓝绿为主色调。在旋子彩画中，以旋子为母题。在苏式彩画中，藻头部分将檩、垫、枋分画，各在端头画卡子。卡子与包袱之间随宜画花卉与枋子集锦。藻头是彩画的重要表现部位，因其上彩画不同，可表现出或庄严或轻松的格调。'],
      ['中国古代建筑', '陵墓', '兆域图', 'Zhaoyu Tu', '是1983年10月在河北省平山县中山国古墓发现的一块铜板地图。', '铜版上记述了中山王颁布修建陵园的诏令，图文用金银镶嵌。'],
      ['中国古代建筑', '大木作·构件', '中柱', 'Central Column', '在建筑物纵中线上，除山面二端外，顶端支承脊槫(桁、檩) 的通柱称为中柱。', '中柱柱径较其他各柱为大。宋式建筑又称分心柱。'],
      ['中国古代建筑', '陵墓', '中山陵', 'Dr. Sun Yat-sen\'s Mausoleum', '孙中山先生的陵墓，建于1926～1929年，位于今南京市东郊紫金山南麓。', '东毗灵谷寺，西邻明孝陵，整个建筑群依山势而建，由南往北沿中轴线逐渐升高，主要建筑物排列在一条中轴线上。中山陵各个建筑在型体组合、色彩运用、材料表现和细部处理上均取得极好的效果，色调和谐统一，增强着庄严的气氛，含意深刻，气势宏伟，被誉为“中国近代建筑史上第一陵”。'],
      ['中国古代建筑', '大木作·构件', '仔角梁', 'Zijiao Beam', '平行放置在老角梁上的构件，称之为仔角梁（也有写作“梓梁”的）。', '仔角梁的后尾置于搭角下金檫（桁）上，仔角梁头又长出一段。其出挑长度按正身飞椽水平投影长又加出三个椽径。'],
      ['中国古代建筑', '人名', '朱启钤', 'Zhu Qiqian', '近代政治家，中国营造学社创办人。', '近代政治家，中国营造学社创办人。'],
      ['中国古代建筑', '近代建筑', '中山纪念堂', 'Sun Yat-sen Memorial Hall', '广州中山纪念堂是广州人民和海外华侨为纪念伟大的革命先行者孙中山先生而筹资兴建的会堂式建筑。', '由我国著名建筑师吕彦直先生设计,于1931年建成,是广州近代城市中轴线上的重要节点。'],
      ['中国古代建筑', '大木作·铺作', '斗拱', 'Dougong', '又称枓栱、斗科、欂栌、铺作等，是中国建筑特有的一种结构。', '在立柱顶、额枋和檐檩间或构架间，从枋上加的一层层探出成弓形的承重结构叫拱，拱与拱之间垫的方形木块叫斗，合称斗拱。'],
      ['中国古代建筑', '大木作·度量', '材', 'Cai', '基本意思是木料，泛指一切原料或资料。在建筑中指标准材。', '基本意思是木料，泛指一切原料或资料。在建筑中指标准材。'],
      ['中国古代建筑', '大木作·铺作', '转角铺作', 'Corner Bracket Set', '转角铺作又称为角科斗拱，是檐下斗拱的三种类型之一。', '按照斗拱的出现位置，其余两种分别为：平身科（又称补间铺作）与柱头科（又称柱头铺作）。'],
      ['中国古代建筑', '大木作·铺作', '柱头铺作', 'Column-top Bracket Set', '柱头铺作又称为柱头科斗拱，是斗拱的三种类型之一。', '其余两种分别为：平身科（又称补间铺作）与角科（转角铺作）。'],
      ['中国古代建筑', '大木作·铺作', '栌斗', 'Lu Dou (Cap Block)', '位于斗栱的最下层，是重量集中处最大的斗。', '宋朝时称为“栌枓”。又称坐斗 ，大斗。'],
      ['中国古代建筑', '大木作·铺作', '交互斗', 'Jiaohu Dou', '十八斗，又称交互斗，是指在翘昂两端，承托上层栱昂交叉点、栱翘交叉点，十字卯口。', '十八斗，又称交互斗，是指在翘昂两端，承托上层栱昂交叉点、栱翘交叉点，十字卯口。'],
      ['中国古代建筑', '大木作·铺作', '散斗', 'San Dou', '散斗是比座斗小的斗。', '因旧时量米容器中较大的称斗，小的叫升，且按十升为一斗进制，故此而得名。'],
      ['中国古代建筑', '大木作·铺作', '华栱', 'Hua Gong', '华栱，垂直出跳构件，分足材和单材，足材加栔。', '华栱，垂直出跳构件，分足材和单材，足材加栔。'],
      ['中国古代建筑', '大木作·铺作', '瓜栱', 'Gua Gong', '瓜栱是位置於於斗栱中间位置而得名的中国古代建筑的名词。', '瓜栱是位置於於斗栱中间位置而得名的中国古代建筑的名词。'],
      ['中国古代建筑', '大木作·铺作', '泥道栱', 'Nidao Gong', '宋代斗拱构件名称,相当于清代的正心瓜拱。', '位于斗拱左右中线上的瓜拱,也在檐柱中心线上,这样的瓜拱叫做“正心瓜拱”。因为宋代时两朵斗拱之间的空档,也就是拱眼壁,当时是用泥坯填塞,所以有“泥道拱”之名。'],
      ['中国古代建筑', '大木作·铺作', '令栱', 'Ling Gong', '宋代斗拱构件名称,相当于清代的厢拱。', '斗拱中最外一踩承托挑檐枋,或是最里一踩承托天花枋的拱,叫做“厢拱”。厢拱置于最上层的昂或翘上面。'],
      ['中国古代建筑', '大木作·铺作', '耍头', 'Shuatou', '最上一层栱或昂之上，与令栱相交而向外伸出如蚂蚱头状的部分叫做耍头。', '也叫做“爵头”、“胡孙头”。'],
      ['中国古代建筑', '大木作·铺作', '蚂蚱头', 'Grasshopper Head', '蚂蚱头,也叫猢狲头。顶层华栱(明、清称“翘”)或昂上与令栱(明、清称“厢拱”)垂直相交的构件。', '蚂蚱头,也叫猢狲头。顶层华栱(明、清称“翘”)或昂上与令栱(明、清称“厢拱”)垂直相交的构件。'],
      ['中国古代建筑', '大木作·铺作', '七铺作', 'Seven-puzuo', '宋代斗拱规格之一。', '宋朝的昂一直延伸到后方，支撑着内罗汉枋。至于耍头则也做成昂的形状。不需要延伸到最后。慢拱上方支撑着枋，这样一个简易的宋代七铺作双抄双下昂计心柱头斗拱就做完了。'],
      ['中国古代建筑', '大木作·铺作', '人字栱', 'Inverted V-shaped Brace', '人字栱,人字拱是古代建筑斗栱组合形式的一种,亦称人字形栱。', '人字栱,人字拱是古代建筑斗栱组合形式的一种,亦称人字形栱。'],
      ['中国古代建筑', '大木作·构件', '槫', 'Tuan (Purlin)', '即"桁"或叫"檩"，宋代称"槫"。', '架在梁头位置的沿建筑面阔方向的水平构件。其作用是直接固定椽子，并将屋顶荷载通过梁而向下传递。'],
      ['中国古代建筑', '大木作·构件', '脊槫', 'Ridge Purlin', '又称脊檩。中国古建筑中的构件之一。明清之前用叉手支撑，后用侏儒柱支撑。', '又称脊檩。中国古建筑中的构件之一。明清之前用叉手支撑，后用侏儒柱支撑。'],
      ['中国古代建筑', '大木作·构件', '平槫', 'Ping Purlin', '宋式大木作构件名称。脊槫和檐槫(包括牛脊槫)之间各槫的通称。', '主要用于承托花架槫及屋顶中部荷重。为圆木,长随间广。'],
      ['中国古代建筑', '大木作·构件', '撩风槫', 'Liaofeng Purlin', '宋斗栱外端令栱之上用以承托屋檐之枋料。', '此枋荷载大,故断面高度为其他枋之1倍,如用圆料,则称撩风槫。'],
      ['中国古代建筑', '大木作·构件', '椽', 'Rafter', '椽子，承托屋面用的木构件。圆的叫椽，方的也叫桷。', '椽子，承托屋面用的木构件。圆的叫椽，方的也叫桷。'],
      ['中国古代建筑', '大木作·构件', '飞子', 'Flying Rafter', '因戗角部位的飞椽随着摔网椽,亦作摔网状而逐根立起,成曲线与嫩戗相齐,故将该部位的飞椽,称为立脚飞椽。', '因戗角部位的飞椽随着摔网椽,亦作摔网状而逐根立起,成曲线与嫩戗相齐,故将该部位的飞椽,称为立脚飞椽。'],
      ['中国古代建筑', '大木作·构件', '花架椽', 'Huajia Rafter', '花架椽又叫平椽，也是清式建筑中椽子的名称之一。', '花架椽就是处在各个金桁上的椽子，也可以说只要是在脑椽和檐椽之间的椽子部分，都叫花架椽。花架椽就像金枋、金桁等构件一样，依据建筑物的进深大小、步架多少，在名称上区分出"上花架椽"、"下花架椽"等。'],
      ['中国古代建筑', '大木作·构件', '檐椽', 'Eave Rafter', '架在下金桁与檐桁(正心桁)间的这段椽子,是木构架中最外侧一步架上的椽子。', '架在下金桁与檐桁(正心桁)间的这段椽子,是木构架中最外侧一步架上的椽子。'],
      ['中国古代建筑', '大木作·构件', '驼峰', 'Camel Hump', '为宋式大木作构件名称。即上明造梁架中配合斗棋使用的支承梁结点的构件。', '同时有美化梁栿构架的作用。造型状似驼峰。'],
      ['中国古代建筑', '装修与空间', '平闇', 'Ping\'an', '平闇是指以方木条组成方格子，再在其上加盖板，板子不施彩画。', '现存实例是辽代独乐寺的观音阁以及山西五台山佛光寺大殿。'],
      ['中国古代建筑', '装修与空间', '平棋', 'Pingqi', '棋即室内吊顶,古代也叫做"承尘"。', '在木框间放较大的木板,板下施彩绘或贴以有彩色图案的纸这种形式在宋代成为平棋。'],
      ['中国古代建筑', '彩画', '五彩遍装', 'Wucai Bianzhuang', '在梁、拱的面上，用青绿色或朱色的迭晕为外缘作轮廓，里面画彩色花饰，以朱色或青绿色衬底，色彩效果十分华丽。', '在梁、拱的面上，用青绿色或朱色的迭晕为外缘作轮廓，里面画彩色花饰，以朱色或青绿色衬底，色彩效果十分华丽。'],
      ['中国古代建筑', '彩画', '七朱八白', 'Seven Red Eight White', '七朱八白是宋代《营造法式》彩画作制度中丹粉刷饰屋舍的方法之一。', '七朱八白是宋代《营造法式》彩画作制度中丹粉刷饰屋舍的方法之一。'],
      ['中国古代建筑', '装修与空间', '直棂窗', 'Vertical Mullioned Window', '窗框内用直棂条（方形断面的木条）竖向排列有如栅栏的窗。', '若用三角形断面的破子棂条，又称破子棂窗。'],
      ['中国古代建筑', '装修与空间', '乌头门', 'Wutou Gate', '宋《营造法式》中记载的门的一种类型，是坊门和高等级住宅的一种特殊造型，也称乌头大门、棂星门。', '宋《营造法式》中记载的门的一种类型，是坊门和高等级住宅的一种特殊造型，也称乌头大门、棂星门。'],
      ['中国古代建筑', '装修与空间', '王府大门', 'Wangfu Gate', '中国古代建筑的一种屋宇式宅门，等级高于广亮大门、金柱大门等。', '用于王府，通常有三间一启门和五间三启门两个等级，门上有门钉。'],
      ['中国古代建筑', '大木作·铺作', '偷心', 'Touxin', '偷心造是木结构建筑跳头上不置横栱的斗拱构造形式之一。', '横拱的设置少于斗拱出踩，如斗拱各向内外两侧挑出三拽架称为七踩 ，应列有七列横拱，但在制作时却省去一列或数列横拱，这种做法称为偷心造。'],

      // ================= 2. 西方古代建筑 (Western Ancient/Historical) =================
      ['西方古代建筑', '古罗马', '巴西里卡', 'Basilica', '古罗马法庭、商业贸易场所会议厅大厅，后成为基督教教堂的原型。', '平面长方形，一端或两端有半圆形龛。主体大厅被两排柱子分成三个空间。或被四排柱子分成五个空间。中央较宽的中厅侧廊窄，中厅高出其他部分，入口通常在长边，容量大，结构简单。'],
      ['西方古代建筑', '拜占庭', '拜占庭建筑', 'Byzantine Architecture', '东罗马帝国的建筑风格，特点是帆拱、鼓座、穹顶相结合的做法。', '教堂平面格局大致有三:集中式(君士坦丁堡圣索菲亚大教堂)、巴西利卡式(叙利亚托曼宁教堂)、十字式（威尼斯圣马可教堂)。装饰:马赛克、粉画、石雕。建筑特点:平面中央是穹窿顶为主要构造，外观厚墙与不大的窗子，无柱无廊，内部装饰华丽，外表装饰朴实。'],
      ['西方古代建筑', '巴洛克', '巴洛克建筑', 'Baroque Architecture', '17-18世纪流行于欧洲的一种建筑风格，追求动感、华丽和戏剧性。', '结构特点:1、节奏不规则地跳跃 2、突出垂直分划 3、追求强烈的体积和光影变化 4、有意制造反常出奇的新形式。建筑特点:1、炫耀财富 2、追求新奇 3、趋向自然。代表建筑: 耶稣会教堂、圣卡罗教堂。'],
      ['西方古代建筑', '古典主义', '法国古典主义建筑', 'French Classicism', '17-18世纪法王路易十三、十四专制王权时期的复古建筑。', '采用古典柱式、恢复古典建筑式样、比例的建筑风格。狭义的古典建筑主要是指法国古典主义及其他地区受其影响的建筑。'],
      ['西方古代建筑', '结构构件', '帆拱', 'Pendentive', '连接方形平面和圆形穹顶的球面三角形结构过渡构件。', '拜占庭时期为解决在平面上盖穹顶的几何形状承接过渡问题的做法。成就:1.把顶的重量传递给四角，摆脱承重墙，空间不封闭，平面灵活多变。2.方形平面做圆形穹顶 3.在穹顶的统帅下完成了集中式构图。'],
      ['西方古代建筑', '结构构件', '飞扶壁', 'Flying Buttress', '哥特建筑所特有的一种飞券。', '利用从墙体上部向外挑出一个或多个券形构件，在中厅两侧,凌空越过侧廊上空，在中厅每间十字拱四角的起脚抵住侧推力，将墙体所承受的压力传到一定距离外的柱墩上，实际上起支撑作用，解决了水平推力的问题。'],
      ['西方古代建筑', '中世纪', '哥特式建筑', 'Gothic Architecture', '兴盛于中世纪高峰与末期的建筑风格，发源于十二世纪的法国。', '由罗曼式建筑发展而来，为文艺复兴建筑所继承。特征是尖券、骨架券、飞扶壁和彩色玻璃窗。'],
      ['西方古代建筑', '复古思潮', '古典复兴建筑', 'Classical Revival', '18世纪60年代到19世纪末在欧美流行的复古思潮。', '分为罗马复兴和希腊复兴两种倾向。建筑体形单纯、独立、完整，细部处理朴实，形式合乎逻辑，纯装饰构件较少。代表: 国会、法院、银行等公共建筑。'],
      ['西方古代建筑', '理论', '建筑十书', 'The Ten Books on Architecture', '欧洲古代建筑学专著，古罗马建筑师维特鲁威著。', '书分十卷，内容十分完备，包括建筑师的修养、柱式、城市规划、施工机械等。'],
      ['西方古代建筑', '古埃及', '吉萨金字塔群', 'Giza Pyramid Complex', '古埃及法老陵墓群，包括胡夫、哈夫拉、孟卡乌拉金字塔。', '方锥形金字塔的代表，哈夫拉金字塔前有著名的狮身人面像大斯芬克斯。'],
      ['西方古代建筑', '装饰风格', '洛可可', 'Rococo', '18世纪20年代产生于法国的装饰风格，纤弱娇媚、华丽精巧。', '主要表现在室内装饰上。洛可可风格的基本特点是纤弱娇媚、华丽精巧、甜腻温柔、纷繁琐细。它以欧洲封建贵族文化的衰败为背景。'],
      ['西方古代建筑', '柱式', '罗马五柱式', 'Roman Orders', '塔司干、罗马多立克、罗马爱奥尼、科林斯、混合柱式。', '柱式通常由柱子和檐部组成:柱子由柱头、柱身、柱础组成。罗马塔司干柱式的柱径与柱高的比例是1:7。'],
      ['西方古代建筑', '中世纪', '罗马风建筑', 'Romanesque Architecture', '10—12世纪在欧洲基督教地区流行的一种建筑风格。', '其结构基础来源于古罗马的建筑构造方式，经常采用古罗马建筑的一些传统做法，如半圆拱，十字拱等。采用扶壁以对抗沉重拱顶的侧推力。实例:比萨大教堂建筑群。'],
      ['西方古代建筑', '平面形式', '拉丁十字平面', 'Latin Cross', '纵臂显著长于横臂的十字形教堂平面。', '在原有巴西利卡基础上横向穿插一相对小得多的巴西利卡形式，长轴东西向有较高中厅和两边侧廊组成，西端为主入口，东端为圣坛。'],
      ['西方古代建筑', '古希腊', '帕提农神庙', 'Parthenon', '雅典卫城的主要建筑物，古希腊多立克柱式的最高成就。', '帕提农原意处女宫，是守护神雅典娜的庙。形制是卫城中最典型，即长方形平面，列柱围廊式。全方面采用了最庄严的庙宇型制多立克，内部综合运用了多立克、爱奥尼。'],
      ['西方古代建筑', '古波斯', '帕赛玻里斯', 'Persepolis', '波斯帝国时期古城。', '两个仪典大厅、后宫、财库以"三门厅"为联系。'],
      ['西方古代建筑', '古西亚', '山岳台', 'Ziggurat', '古代西亚建筑，用于崇拜天体、崇拜山岳、观测星相。', '古代西亚建筑，用于崇拜天体、崇拜山岳、观测星相。'],
      ['西方古代建筑', '古希腊', '狮子门', 'Lion Gate', '迈锡尼卫城的主要入口。', '由两块垂直的石块和一巨大的过梁组成。门道上起缓冲作用的三角石灰石上刻有两头狮子。门两侧城墙突出，形成一狭长的过道，加强防御性。'],
      ['西方古代建筑', '文艺复兴', '坦比哀多', 'Tempietto', '盛期文艺复兴建筑的纪念性风格典型代表，设计人伯拉孟特。', '这是一座集中式圆形建筑，周围16根多立克柱子，有地下墓室。它是第一个成熟的集中式建筑。'],
      ['西方古代建筑', '文艺复兴', '文艺复兴建筑', 'Renaissance Architecture', '15世纪初在意大利兴起的建筑风格，重新使用古典建筑元素。', '建筑平面形式多采用基本几何形状(方形与圆形);注重强调空间的集中性。盛期的代表建筑:罗马的坦比哀多。理论:1、实用、经济、美观 2、美是客观的 3、美就是和谐与完整。'],
      ['西方古代建筑', '柱式', '希腊三柱式', 'Greek Orders', '古希腊三种基本柱式：多立克、爱奥尼、科林斯。', '1、多立克柱式-比例粗壮、刚劲雄健；2、爱奥尼柱式–比例修长、精巧清秀；3、科林斯柱式–比例细长、纤巧精致、高贵华丽。'],
      ['西方古代建筑', '古希腊', '雅典卫城', 'Acropolis of Athens', '古希腊最代表性的建筑群，位于雅典城西南。', '主要建筑是帕提农神庙、伊瑞克先神庙、胜利神庙卫城山门等。建筑群布局自由，高低错落，主次分明，无论是身处其间或从城下仰望，都能看到较为完整与丰富的建筑艺术形象。'],
      ['西方古代建筑', '古罗马', '大角斗场', 'Colosseum', '古罗马圆形竞技场，开创了体育建筑的先河。', '容纳5－8万人，椭圆形。四层建筑、券柱式立面。下部三层采用了不同的柱式构图，由下向上依次为塔司干、爱奥尼、科林斯、混合柱式。'],
      ['西方古代建筑', '古希腊', '古典柱式', 'Classical Orders', '古希腊和古罗马建筑中柱子、额枋和檐部的形式、比例和相互组合的规范。', '古希腊和古罗马建筑中柱子、额枋和檐部的形式、比例和相互组合的规范。'],
      ['西方古代建筑', '结构构件', '骨架券', 'Ribbed Vault', '哥特时期作为拱顶的承重构件。', '在一个正方形或矩形平面四角的四个柱子上做双圆心尖券，四条边和两条对角线上各做一道尖拱。屋顶的石板架在这六道券上。'],
      ['西方古代建筑', '柱式', '巨柱式', 'Giant Order', '产生于古罗马时期，一个柱式贯穿二层或三层。', '优点是能够突破水平分划的限制，可使得建筑显得高大雄伟，缺点是尺度失真。'],
      ['西方古代建筑', '结构构件', '肋架栱', 'Ribbed Vault', '产生于公元四世纪的古罗马的一种拱券结构，后被欧洲中世纪建筑大大发扬。', '其基本原理是把拱顶区分为承重部分和围护部分，从而大大减轻拱顶，并把荷载集中到券上以摆脱承重墙。'],
      ['西方古代建筑', '理论', '《论建筑》', 'De re aedificatoria', '1485年出版，作者阿尔伯蒂。是意大利最重要的理论著作。', '以人文主义思想为基础，着重基本理论及造型美的客观规律。建筑创作的基本任务是实用、经济、美观。建筑的美是客观的，存在于建筑本身。'],
      ['西方古代建筑', '文艺复兴', '帕拉第奥母题', 'Palladian Motif', '帕拉第奥改建维琴察巴西利卡时创造的一种券柱式构图。', '在两柱子中间按适当比例发一个券，券脚落在两个独立的小柱子上，上面架着额枋，小额枋之上开一个圆洞。它的适应性强。'],
      ['西方古代建筑', '立面构图', '劵柱式', 'Arch Order', '古罗马建筑技术上以及艺术上一大成就，由券同柱式组成。', '支撑拱券的墙和柱子又大又重，必须装饰，用柱式去装饰券，后来产生了券柱式的组合，解决了柱式与拱券的矛盾。'],
      ['西方古代建筑', '日本古建', '寝殿造', 'Shinden-zukuri', '日本府邸和住宅的形制之一，受中国建筑影响。', '正屋（寝殿）居中，前有池沼，两侧有配屋（东对 西对），其间连以开场的游廊。'],
      ['西方古代建筑', '日本古建', '书院造', 'Shoin-zukuri', '日本府邸住宅形式的一种。', '特点：有一间主要的房间（上段，一之间），这间房间的正面墙壁划分为两个龛，左侧叫床（押板），右面是一个博古架，叫棚（违棚）。'],
      ['西方古代建筑', '结构构件', '十字拱', 'Groin Vault', '公元1世纪中叶古罗马开始使用，覆盖在方形的间上，仅需四角有支柱。', '不必要连续的承重墙，建筑内部空间得到解放，它促进了建筑平面的模数化。十字拱又便于开侧窗，大有利用大型建筑物内部的采光。'],
      ['西方古代建筑', '印度古建', '窣堵波', 'Stupa', '古代佛教特有的建筑类型之一，佛塔的前身。', '半球型的建筑物，是一种埋葬佛祖火化后留下的舍利的一种坟墓建筑。基本形制是用砖石垒筑圆形或方形的台基，之上建有一半球形覆钵。'],
      ['西方古代建筑', '平面形式', '希腊十字平面', 'Greek Cross', '中央穹顶和它四面的筒形拱成等臂的十字。', '中世纪罗马风时期较为流行的一种平面形制。威尼斯圣马可教堂的平面即为希腊十字型。'],
      ['西方古代建筑', '文艺复兴', '圆厅别墅', 'Villa Rotonda', '帕拉迪奥设计。平面完全对称，四面各有六柱的柱廓，中央圆厅有穹窿顶。', '帕拉迪奥设计。平面完全对称，四面各有六柱的柱廓，中央圆厅有穹窿顶。'],
      ['西方古代建筑', '古罗马', '图拉真广场', 'Trajan\'s Forum', '古罗马最大的帝国议事广场。', '参照了东方君主国建筑的特点，不仅轴线对称，而且做多层纵深布局。包含图拉真纪功柱、乌尔比亚巴西利卡等。'],
      ['西方古代建筑', '古埃及', '方尖碑', 'Obelisk', '古埃及崇拜太阳的纪念碑。', '常成对地竖立在神庙的入口处。其断面呈正方形，上小下大，顶部为金字塔形，常镀合金。最高50余米，碑身刻有象形文字的阴刻图案。'],
      ['西方古代建筑', '古希腊', '爱琴文明建筑', 'Aegean Architecture', '希腊上古时代，处于克里特岛和迈西尼城周围的爱琴海一带的建筑文化。', '最早创造了“正室”的布局形式。代表实例：克诺索斯 米诺斯王宫，迈西尼城狮子门，阿托雷斯宝库。'],
      ['西方古代建筑', '风格', '帝国式风格', 'Empire Style', '拿破仑帝国时代的法国，以古罗马式样为主的古典复兴。', '建筑追求外观上的雄伟、壮丽、内部则常常吸取东方的各种装饰or洛可可手法。代表：星形广场凯旋门。'],
      ['西方古代建筑', '复古思潮', '新古典主义', 'Neoclassicism', '18世纪中叶兴起的古典复兴思潮。', '恢复了古希腊、古罗马的式样，讲究理性简洁与和谐之美。代表：巴黎万神庙，德国柏林勃兰登堡门。'],
      ['西方古代建筑', '中世纪', '玫瑰花窗', 'Rose Window', '哥特式建筑中装饰富丽的圆窗，内呈放射状。', '主要用在中堂的西端和耳堂的两端，世界上最漂亮的玫瑰窗就是这个时期巴黎圣母院的玫瑰窗。'],
      ['西方古代建筑', '古希腊', '列雪柱拉德音乐纪念亭', 'Choragic Monument', '公元前3世纪希腊本土后期的作品，早期科林斯柱式的代表。', '圆亭立于一2.9米见方的基座上，顶上为得奖奖杯。造型秀丽，装饰自下而上渐丰富。'],
      ['西方古代建筑', '古罗马', '万神庙', 'Pantheon', '古罗马时期单一空间、集中式构图的建筑物代表。', '也是罗马穹顶技术的最高代表，平面圆形的，穹顶直径达43.3米，中央开一个直径8.9米的圆洞。'],
      ['西方古代建筑', '拜占庭', '圣索菲亚大教堂', 'Hagia Sophia', '拜占庭时期建筑的典型代表，位于君士坦丁堡，采用集中式形制。', '其成就主要有3个方面，一、它的结构关系明确，层次井然。二，既集中统一又曲折多变的内部空间。三，内部灿烂夺目的色彩效果。'],
      ['西方古代建筑', '古西亚', '空中花园', 'Hanging Gardens', '新巴比伦城门西侧，建在梯形平台上的花园。', '为四层平台，25 米高。建筑群有空心柱子，每层设有喷水装置。被誉为古代七大奇迹之一。'],
      ['西方古代建筑', '日本古建', '枯山水', 'Karesansui', '源于日本本土的缩微式园林景观，多见于禅宗寺院。', '在特有的环境气氛中，细细耙制的白砂石铺地、叠放有致的几尊石组，就能对人的心境产生神奇的力量。'],
      ['西方古代建筑', '装饰风格', '穆达伽风格', 'Mudejar Style', '西班牙在八世纪被阿拉伯占领后，伊斯兰建筑手法掺入到哥特建筑中形成的风格。', '用马蹄形券，镂空的石窗棂，大面积的几何图或其它花纹。'],
      ['西方古代建筑', '屋顶形式', '孟莎式屋顶', 'Mansard Roof', '方底两折式屋顶，下部很徒，而上部徒度突然转折变的很平缓。', '使内部空间好用，它是法国17世纪的独特屋顶形式。'],
      ['西方古代建筑', '日本古建', '鸟居', 'Torii', '一种类似于中国牌坊的日式建筑，常设于通向神社的大道上。', '做法是一对柱子上架一根横木，也有的在横木下再加一根枋子，这种牌坊叫做鸟居。'],
      ['西方古代建筑', '巴洛克', '超级巴洛克', 'Ultra-Baroque', '巴洛克在西班牙的传播的一个流变，兴起于17世纪中叶。', '造型自由奔放，装饰繁复，富于变化，但往往有的建筑过分装饰堆砌。代表建筑：圣地亚哥·德·贡波斯代拉教堂。'],
      ['西方古代建筑', '古罗马', '浴场建筑', 'Thermae', '古罗马的公共浴场是多功能、综合性的大型公共建筑群。', '功能齐全、设备完善、结构出色、空间丰富，代表了古罗马建筑的最高成就。对18世纪以后，欧洲大型公共建筑的空间设计产生了极大的影响。'],
      ['西方古代建筑', '结构构件', '透视门', 'Perspective Portal', '哥特式建筑中，为了减轻厚墙的沉重感，将门旁的墙壁做成一排一排锯齿形装饰。', '如巴黎圣母院就是这种做法。'],
      ['西方古代建筑', '结构构件', '抹角拱', 'Squinch', '拜占庭建筑中，用以从方形平面向圆顶过渡的结构构件。', '使得穹顶的支撑和平衡体系下产生丰富多变的空间。抹角拱的作用与帆拱相同。'],
      ['西方古代建筑', '伊斯兰', '钟乳拱', 'Muqarnas', '又称蜂窝拱，伊斯兰建筑中由一个个层叠的小型半穹窿组成。', '在结构上起出挑作用，在造型上起装饰作用。'],
      ['西方古代建筑', '广场', '西班牙大阶梯', 'Spanish Steps', '巴洛克手法在城市设计中的代表实例。', '阶梯平面呈花瓶形，布局时分时合，巧妙地把两个不同标高、轴线不一的广场统一起来，表现出巴洛克灵活自由的设计手法。'],
      ['西方古代建筑', '古埃及', '斯芬克斯', 'Sphinx', '古埃及神话中长有翅膀的怪，通常为雄性，是“仁慈"和“高贵"的象征。', '狮身人面像位于埃及的开罗市西侧吉萨区的哈夫拉金字塔南面。'],
      ['西方古代建筑', '古西亚', '人首翼牛像', 'Lamassu', '萨艮二世王宫中央拱门门洞口两侧及碉楼转角处的石板上雕的像。', '正面为圆雕，侧面为浮雕。正面2条腿，侧面4条腿，转角1条在两面共用，共5条腿。'],
      ['西方古代建筑', '古西亚', '巴别塔', 'Tower of Babel', '圣庙北侧高耸入云的大庙塔，据说是《圣经》里的通天塔。', '在汉穆拉比最早建造巴比伦城时就己建造起来,并在尼布拉尼撒时得已完善。'],
      ['西方古代建筑', '结构构件', '交叉拱', 'Cross Vault', '用两个等跨筒拱在平面上成直角相贯，以覆盖方形平面的空间。', '这样可取消承重墙，仅四角共四个支点即可支承十字拱顶，使空间开放,结构重量减轻。'],
      ['西方古代建筑', '装饰技艺', '湿壁画', 'Fresco', '在璧面基底半干时，用清石灰水调和颜料进行绘制。', '颜色与未干燥的墙面经过渗透面牢固结合，干燥之后产生一种特殊的效果。由于必须一次完成，不容打草图与修改，技巧上难度较大。'],
      ['西方古代建筑', '中世纪', '比萨斜塔', 'Leaning Tower of Pisa', '比萨大教堂的钟塔，因地基不均匀沉降而倾斜。', '圆形，直径大约16，高55m，分为8层。中间六层用的围着罗曼式的空券廊。'],
      ['西方古代建筑', '广场', '圣马可广场', 'Piazza San Marco', '意大利威尼斯的中心广场。', '由总督宫、圣马可教堂、圣马可钟楼等建筑和威尼斯大运河所围成的长方形广场。'],
      ['西方古代建筑', '古波斯', '百柱厅', 'Hall of 100 Columns', '位于西亚帕赛玻里斯方宫里的一个典仪性的大厅，因其中有石柱100根而得名。', '位于西亚帕赛玻里斯方宫里的一个典仪性的大厅，因其中有石柱100根而得名。'],
      ['西方古代建筑', '古罗马', '泰达斯凯旋门', 'Arch of Titus', '古罗马凯旋门的典型代表，是现存最早的凯旋门。', '位于建于公元1世纪。外形近方形，深度比较大，组人以稳定、庄严之感。凯旋门为混凝土浇筑，外部用白色大理石贴面，使用组合柱式。'],
      ['西方古代建筑', '古罗马', '纪功柱', 'Memorial Column', '起源于古罗马的一种纪念性建筑物。', '特点是柱身中空，可延台阶盘旋而上，柱身常有雕刻，记载某人的功绩，柱头多立所表扬人的立像。代表为图拉真广场上的图拉真纪功柱。'],
      ['西方古代建筑', '中世纪', '威尼斯总督府', 'Doge\'s Palace', '欧洲中世纪最美的建筑物之一。', '现状主要是14世纪时的重建的，建筑师齐阿尼，主要特色在南立面和西立面的构图。第一层是券廊，圆柱粗壮有力。最上层的高度占整个高度的大约1/2，全是实墙。'],
      ['西方古代建筑', '伊斯兰', '狮子院', 'Court of Lions', '西班牙阿尔罕布拉宫中的庭院。', '中央有一座有12头己拙的石狮组成的喷泉，水从狮口喷出，流向周围的浅沟。四周有124根纤细的白色大理石柱。'],
      ['西方古代建筑', '文艺复兴', '手法主义', 'Mannerism', '意大利文艺复兴后期出现的一种建筑设计倾向。', '特点是追对新颖尖巧，堆砌壁龛、雕塑、涡卷等，玩弄诡谲的光影、不安定的体形和不合结构逻辑的起付断裂或错位。'],
      ['西方古代建筑', '建筑师', '钱伯斯', 'William Chambers', '18世纪英国著名建筑师，为帕拉蒂奥主义、先浪漫主义代表者。', '曾两次到中国，为欧洲较早的对中国园林进行研究的建筑师之一。代表建筑骚莫赛特大厦、王家园林丘园(中国式)，代表著作《中国式建筑设计》、《泛论》。'],
      ['西方古代建筑', '理论', '拉斯金', 'John Ruskin', '19世纪英国的散文家、美术理论家，推崇富有宗教感的中世纪建筑。', '万为推崇哥特式建筑，但提倡建筑应该注重形式与功能结合，拉斯金极大地推动了英国浪漫主义建筑风格。代表著作《建筑七灯》。'],
      ['西方古代建筑', '结构构件', '锤式屋架', 'Hammerbeam Roof', '16世纪上半叶，英国室内大厅用的一种装饰性木屋架形式。', '特点是用于重要大厅，富有装饰性。由两侧向中央逐级升高，每级下有一个弧形的撑托和一个雕镂精致的下垂的装饰物。代表建筑罕普敦府邸大厅。'],
      ['西方古代建筑', '结构构件', '束柱', 'Clustered Column', '起源于10-12世纪西欧罗马风建筑，细柱与券肋气势相连。', '教堂中柱柱头逐渐退化，中厅和侧窗的拱顶的骨架券一直延伸下来，贴在柱墩的四面，形成了集束柱，增强向上的动势。'],
      ['西方古代建筑', '结构构件', '鼓座', 'Tholobate', '拜占庭建筑中的一种结构名称。', '位于穹顶与帆拱之间的竖筒形结构,把穹顶的荷载传到帆拱上，代表为基辅圣索菲亚教堂。'],
      ['西方古代建筑', '理论', '维特鲁威', 'Vitruvius', '古罗马时期，奥古斯都的军事工程师与建筑师。', '他写作了《建筑十书》这本奠定了欧洲建筑科学的基本体系的著作。'],

      // ================= 建筑风格与设计思潮 (Refined and Expanded from PDF) =================
      ['建筑风格与设计思潮', '古典与历史风格', '古典主义', 'Classicism', '建于公元前7世纪到4世纪的古希腊，以柱式、对称、几何和透视原则为特征。', '最著名的是大型石造宗教神殿。表达古典主义风格最显著的特征是古希腊的三种“建筑柱式”：多立克（Doric）、爱奥尼（Ionic）和科斯林（Corinthian）。代表作帕特农神庙（公元前5世纪）展示了建筑体积在基座上的支撑关系。'],
      ['建筑风格与设计思潮', '古典与历史风格', '罗马式建筑', 'Romanesque Architecture', '6世纪到9世纪欧洲发展起来的风格，以厚重坚固的墙壁和半圆形拱门的最小开窗方式为特色。', '受古罗马启发，背景是欧洲各国处于战争状态、防御需求增加。代表作：西班牙圣地亚哥-德孔波斯特拉主教座堂（Santiago de Compostela Cathedral）。'],
      ['建筑风格与设计思潮', '古典与历史风格', '哥特式建筑', 'Gothic Architecture', '起源于法国中世纪晚期（900-1300年），特征是垂直高耸、尖形拱门和肋状拱顶。', '最初被命名为Opus Francigenum（法国式作品）。“哥特式”一词出现于启蒙运动时期。代表作：巴黎圣母院大教堂、兰斯大教堂。'],
      ['建筑风格与设计思潮', '古典与历史风格', '巴洛克风格', 'Baroque Style', '16世纪开始，利用装饰和建筑元素建立戏剧性感觉，通过明暗对比将结构视为装饰。', '早期典型作品是罗马的耶稣堂（Church of Gesù），拥有第一个真正意义上的巴洛克式外观。'],
      ['建筑风格与设计思潮', '古典与历史风格', '新古典主义', 'Neoclassicism', '18世纪开始，试图复兴希腊和罗马的古典建筑，带来理性对称的建筑。', '受社会经济背景、工业革命及重新接触古代作品影响，是对巴洛克的回应。'],
      ['建筑风格与设计思潮', '古典与历史风格', '学院派建筑', 'Beaux-Arts Architecture', '起源于19世纪30年代巴黎美术学校，参考新古典、哥特及文艺复兴，并使用玻璃和铁等现代材料。', '影响了美国建筑（如路易斯·沙利文）。呈现与现代线条融合的雕塑装饰。代表：巴黎大皇宫、纽约中央车站。'],
      ['建筑风格与设计思潮', '近现代风格', '新艺术风格', 'Art Nouveau', '对折衷主义的回应，体现为充满弯曲和蜿蜒线条的装饰元素，受有机形状启发。', '最早由比利时建筑师维克多·霍塔（Victor Horta）设计，最具代表性的是法国赫克托·吉马德（Hector Guimard）的作品。'],
      ['建筑风格与设计思潮', '近现代风格', '艺术装饰风格', 'Art Deco', '融合现代设计、手工元素和奢华材料，代表对科技进步的信念。', '奥古斯特·贝瑞（Auguste Perret）是早期运用钢筋混凝土的大师。代表作：香榭丽舍剧院（1913）。'],
      ['建筑风格与设计思潮', '近现代风格', '包豪斯风格', 'Bauhaus Style', '20世纪初，注重满足实用要求，发挥新材料结构性能，造型整齐简洁，构图灵活。', '创始人瓦尔特·格罗皮乌斯。主张艺术与技术结合，走建筑工业化道路。'],
      ['建筑风格与设计思潮', '近现代风格', '现代主义', 'Modernism', '20世纪上半叶诞生，主张功能主义，机器美学。', '代表人物：格罗皮乌斯、柯布西耶、密斯、赖特。柯布西耶提出“新建筑五点”。'],
      ['建筑风格与设计思潮', '近现代风格', '后现代主义', 'Postmodernism', '20世纪70年代末兴起，从新历史和构图角度审视现代主义，常用讽刺和流行文化元素。', '代表作：《向拉斯维加斯学习》是后现代主义思想的开创性著作之一。'],
      ['建筑风格与设计思潮', '近现代风格', '解构主义', 'Deconstructivism', '20世纪80年代，对设计规则提出质疑，融入非线性动力学，拆除传统思维模式。', '受结构主义和俄国构成主义影响。1988年MoMA展览汇集了艾森曼、盖里、哈迪德、库哈斯、里伯斯金、屈米、普利克斯的作品。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '瓦尔特·格罗皮乌斯', 'Walter Gropius', '现代主义建筑学派的倡导人和奠基人之一，包豪斯学校创办人。', '主张走建筑工业化道路。代表作：法古斯鞋楦厂（1911）、包豪斯校舍（1925，玻璃幕墙先声）、西门子城住宅区。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '勒·柯布西耶', 'Le Corbusier', '现代主义建筑旗手，功能主义之父，机器美学奠基人。', '提出“新建筑五点”：底层架空、屋顶花园、自由平面、自由立面、横向长窗。代表作：萨伏伊别墅（1929）、马赛公寓（1947）、朗香教堂（1950）。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '弗兰克·劳埃德·赖特', 'Frank Lloyd Wright', '美国有机建筑大师，工艺美术运动美国派代表。', '崇尚自然，提出“有机建筑”理念。代表作：流水别墅（1936，悬挑楼板与自然结合）、古根海姆博物馆。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '密斯·凡·德·罗', 'Mies van der Rohe', '现代主义大师，提出“少就是多”（Less is more）。', '主张“流通空间”和“全面空间”。代表作：巴塞罗那德国馆（1929）、西格拉姆大厦（1954）、范斯沃斯住宅。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '阿尔瓦·阿尔托', 'Alvar Aalto', '芬兰建筑师，倡导民族化与人情化的现代建筑理念。', '设计涵盖建筑、家具（弯曲木材）及规划。代表作：帕伊米奥结核病疗养院（1929）、玛利亚别墅（1938）、维普里图书馆。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '法古斯鞋楦厂', 'Fagus Factory', '格罗皮乌斯早期代表作（1911），现代建筑里程碑。', '首次大规模使用玻璃幕墙，转角处取消柱子，体现了工业美学。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '包豪斯校舍', 'Bauhaus School Building', '格罗皮乌斯设计的包豪斯德绍校舍（1925）。', '功能分区明确，通过天桥和连廊组合，大面积玻璃幕墙。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '新建筑五点', 'Five Points of Architecture', '柯布西耶1926年提出的现代建筑设计原则。', '底层架空柱、屋顶花园、自由平面、自由立面、横向长窗。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '萨伏伊别墅', 'Villa Savoye', '柯布西耶的代表作（1929），完美体现了新建筑五点。', '被誉为“居住的机器”，是现代主义建筑的图标。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '马赛公寓', 'Unité d\'Habitation', '柯布西耶战后代表作（1947-1952），粗野主义的先驱。', '巨型钢筋混凝土结构，不仅是住宅，还包含商店、幼儿园等社区设施，像一座垂直城市。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '朗香教堂', 'Ronchamp Chapel', '柯布西耶晚期作品（1950-1955），转向表现主义。', '具有雕塑感的厚重屋顶和不规则窗洞，创造了神秘的光影效果，被誉为20世纪最震撼的建筑之一。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '草原式住宅', 'Prairie Style', '赖特早期住宅风格，灵感来自美国中西部草原。', '强调水平线条，低坡屋顶，深远的挑檐，与大地紧密结合。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '流水别墅', 'Fallingwater', '赖特为卡夫曼家族设计的别墅（1936-1939）。', '建筑横跨瀑布之上，巨大的悬挑楼板锚固在自然山石中，是人与自然融合的杰作。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '有机建筑', 'Organic Architecture', '赖特的核心设计哲学。', '主张建筑应像植物一样从大地中生长出来，形式与功能统一，内部空间向外延伸。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '少就是多', 'Less is more', '密斯·凡·德·罗的设计名言。', '反对装饰，追求结构和形式的极致精简与纯净。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '流通空间', 'Flowing Space', '密斯提出的空间概念。', '打破房间的封闭感，使内部空间相互贯通并延伸至室外。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '全面空间', 'Universal Space', '密斯提出的通用空间概念。', '一个巨大的、无柱的、可灵活划分的大空间。代表作：克朗楼（Crown Hall）。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '巴塞罗那德国馆', 'Barcelona Pavilion', '密斯设计的1929年世博会德国馆。', '以大理石、玻璃和钢材构成，体现了“流通空间”和极简主义美学。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '西格拉姆大厦', 'Seagram Building', '密斯设计的纽约摩天大楼（1954-1958）。', '玻璃与青铜的完美结合，精致的细部（工字钢装饰），是国际式风格的巅峰。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '帕伊米奥结核病疗养院', 'Paimio Sanatorium', '阿尔托的早期功能主义代表作（1929）。', '设计充分考虑病人心理和生理需求（如采光、色彩、无眩光照明），体现了“建筑人情化”。'],
      ['建筑风格与设计思潮', '著名建筑师与理论', '玛利亚别墅', 'Villa Mairea', '阿尔托设计的住宅（1938）。', '融合了现代主义形式与芬兰传统材料（木材、砖、石），强调自然感和触感。'],
      ['建筑风格与设计思潮', '流派', '高技派', 'High-tech', '20世纪60年代出现以新技术手段创造性的解决建筑问题的倾向。', '强调新时代的审美观.力求使高度工业技术接近人们的生活方式和传统的美学观。代表作:蓬皮杜艺术中心。'],
      ['建筑风格与设计思潮', '工艺美术', '工艺美术运动', 'Arts and Crafts Movement', '19世纪后期英国出现的设计改革运动。', '提倡用手工艺生产表现自然材料.以改革传统形式，反对粗制滥造的机器产品。在建筑上主张建造"田园式"住宅来摆脱古典建筑的束缚。代表人物是拉斯金和莫里斯。'],
      ['建筑风格与设计思潮', '现代主义', '功能主义', 'Functionalism', '将实用作为美学主要内容、将功能作为建筑追求目标的一种创作思潮。', '芝加哥建筑师沙里文是功能主义的奠基者。提出"形式服从功能"的口号。'],
      ['建筑风格与设计思潮', '现代主义', '构成主义', 'Constructivism', '一战前后俄国青年艺术家把抽象几何形体组成的空间当绘画和雕刻的内容。', '其思想是用构成来表现，用造型自身的规律，将建筑分割成一些要素，来进行构成。代表作:塔特林第三国际纪念碑。'],
      ['建筑风格与设计思潮', '现代主义', '表现主义', 'Expressionism', '20世纪初德国和奥地利的一种艺术流派。', '认为艺术的任务首先在于表现个人的主观感受和体验。表现主义建筑师常采用奇特、夸张的建筑形体来表现或象征某些思想感情或某种时代精神。代表作:门德尔松德国波茨坦市爱因斯坦天文台。'],
      ['建筑风格与设计思潮', '现代主义', 'CIAM', 'CIAM', '国际现代建筑协会，1928年在瑞士成立。', '发起人包括勒.柯布西耶、格罗皮乌斯等。1933年发表了著名的城市规划理论和方法的纲领性文件《雅典宪章》。'],
      ['建筑风格与设计思潮', '现代主义', '粗野主义', 'Brutalism', '20世纪50-60年代兴起，强调材料真实性和结构表现力的风格。', '建筑材料保持自然特色,混凝土梁柱墙面完工时不加粉刷，留下模板表面毛糙的痕迹.具有质朴和清新的形象，构件沉重肥大超常规．交接比较粗鲁生硬。实例:马赛公寓。'],
      ['建筑风格与设计思潮', '结构主义', '结构主义', 'Structuralism', '强调整体性和共时性的建筑思潮。', '认为建筑师的任务并不是提供任何现成理论，而应该提供空间框架，最终由使用者自己选择占有并呈现特征。实例:赫茨贝格荷兰中央贝赫保险公司大楼。'],
      ['建筑风格与设计思潮', '理论', '少就是乏味', 'Less is bore', '罗伯特·文丘里针对现代主义提出的反驳。', '他鼓吹一种杂乱的、复杂的、含混的、折衷的、象征主义的和历史主义的建筑．这和波普运动一脉相承。'],
      ['建筑风格与设计思潮', '现代主义', '理性主义', 'Rationalism', '20世纪初期探索现代建筑发展方向的创作思潮。', '原则是:①注重建筑目的的逻辑性;②注重建造过程的逻辑性;③注重建筑使用的逻辑性。提倡简介、清晰、明朗的建筑风格。'],
      ['建筑风格与设计思潮', '复古思潮', '浪漫主义', 'Romanticism', '18世纪下半叶到19世纪上半叶活跃于欧洲的思潮。', '要求发扬个性自由、提倡自然天性，用中世纪手工业艺术的自然形式来反对资本主义制度下用机器制造出来的工艺品。'],
      ['建筑风格与设计思潮', '流派', '纽约五人组', 'New York Five', '1969年纽约现代艺术博物馆举办展览的5位美国建筑师。', 'R.迈耶，P.埃森曼，M.格雷夫斯，C.格瓦斯梅, J.海杜克。被认为是新现代思潮的代表。'],
      ['建筑风格与设计思潮', '19世纪', '水晶宫', 'Crystal Palace', '1851年帕克斯顿设计的伦敦世博会展览馆。', '采用了装配建房的方法。整个建筑材料只采用了铁木玻璃三种材料，没有任何多余的装饰．完全表现了工业生产的机械本能。'],
      ['建筑风格与设计思潮', '现代主义', '未来主义', 'Futurism', '一战前出现在意大利的艺术流派，歌颂速度与机器。', '认为建筑风格不应仅仅追求形式的改变.未来的城市应具有全新的功能。'],
      ['建筑风格与设计思潮', '19世纪', '折衷主义建筑', 'Eclecticism', '任意模仿历史上的各种风格或自由组合各种式样。', '为了弥补古典主义与浪漫主义在建筑创作中的局限性。不讲固定的法式，只讲求比例均衡.注重纯形式美。'],
      ['建筑风格与设计思潮', '后现代', '典雅主义', 'Formalism', '二次世界大战后美国官方建筑的主要思潮，又称形式美主义。', '吸取古典建筑传统构图，比较工整严谨，造型简练轻快，以传神代替神似。代表人物有：约翰逊、斯通和雅马萨奇。'],
      ['建筑风格与设计思潮', '现代主义', '德意志制造联盟', 'Deutscher Werkbund', '1907年在德国成立，目的在于提高工业制品质量。', '由企业家、艺术家、技术员组成。'],
      ['建筑风格与设计思潮', '现代主义', '风格派', 'De Stijl', '1917年荷兰青年艺术家组成的造型艺术团体。', '主张把艺术从个人情感中解放出来，寻求一种客观的结构。代表作是由里特弗尔德设计的荷兰乌德勒支住宅。'],
      ['建筑风格与设计思潮', '现代主义', '密斯风格', 'Miesian Style', '40年代末到60年代盛行于美国的建筑设计倾向。', '以“少就是多”为理论来源，以“全面空间”、“纯净空间”、“模数构图”为特征。提倡忠实于结构和材料，特别强调简洁严整的细部处理方法。'],
      ['建筑风格与设计思潮', '理论', '模度', 'Modulor', '柯布西耶从人体尺度出发提出的模数系统。', '选定下垂手臂、脐、头顶、上身手臂四个部位为控制点。形成红尺和蓝尺两套级数。'],
      ['建筑风格与设计思潮', '流派', 'Team X', 'Team X', '以英国史密森夫妇为首的一个青年建筑师组织。', '对CIAM过去的方向提出创造性的批评。提倡以人为核心的城市设计思想。'],
      ['建筑风格与设计思潮', '现代主义', '新陈代谢派', 'Metabolism', '20世纪60年代日本形成的建筑创作组织。', '强调事物的生长、变化、衰亡。认为城市和建筑不是静止的，它像生物新陈代谢那样是一种动态过程。代表作：山梨县文化会馆。'],
      ['建筑风格与设计思潮', '理论', '形式追随功能', 'Form Follows Function', '芝加哥学派沙利文提出。', '认为要每一个建筑物一个适合的和不错误的形式，这才是建筑创作的目的。建筑的设计应该从内而外，形式应与功能一致。'],
      ['建筑风格与设计思潮', '行为', '行为建筑学', 'Behavioral Architecture', '研究人的需要、欲望、情绪等与环境及建筑的关系。', '研究如何可通过城市规划与建筑设计来满足人的行为心理要求。'],
      ['建筑风格与设计思潮', '建筑师', '雅马萨奇', 'Minoru Yamasaki', '美籍日裔建筑师，典雅主义代表人物。', '致力运用传统美学法则来使现代的材料与结构产生规整、端庄与典雅的庄严感。代表：纽约世界贸易中心。'],
      ['建筑风格与设计思潮', '文献', '《走向新建筑》', 'Vers une architecture', '柯布西耶的宣言式小册子。', '激烈否定因循守旧的复古主义、折衷主义，主张创造表现新时代的新建筑。提出了“住宅是居住的机器”。'],
      ['建筑风格与设计思潮', '19世纪', '芝加哥学派', 'Chicago School', '美国最早的建筑流派，现代建筑在美国的奠基者。', '突出功能在建筑设计中的主要地位，明确提出形式随从功能的观点。重要贡献是创造了“芝加哥之窗”和高层金属框架结构。'],
      ['建筑风格与设计思潮', '当代', '新地域主义', 'New Regionalism', '关注建筑所处的文脉和都市现状。', '试图从场所、气候、自然条件以及传统习俗和都市文脉中去思考当代建筑的生成条件与设计原则。代表作：西班牙莫奈奥的作品。'],
      ['建筑风格与设计思潮', '当代', '新乡土派', 'New Vernacular', '注重建筑自由构思结合地方特色与适应各地区人民生活习惯。', '继承了芬兰建筑师阿尔托的主张并加以发展。'],
      ['建筑风格与设计思潮', '前卫', 'Archigram', '建筑电讯派，英国60年代最先锋的创作倾向。', '夸张突出建筑技术符号，畅想“行走城市”，“插入式城市”等。'],
      ['建筑风格与设计思潮', '理论', '符号学', 'Semiology', '把建筑的形看成是一个符号，研究其与意义的关系。', '研究符号本身的逻辑关系及建筑符号系统与使用者之间的关系。'],
      ['建筑风格与设计思潮', '规划', '光明城市', 'Radiant City', '柯布西耶提出的城市集中主义规划思想。', '设想在城市里建高层建筑，现代交通网和城市绿地。即：高层居住建筑+立体快速交通干道+城市功能分区。'],
      ['建筑风格与设计思潮', '理论', '建筑图式思维理论', 'Diagrammatic Thinking', '1980年拉修著《图式思维论》。', '强调建筑师如何用草图和分析图的方法迅速捕捉灵感，找出解决办法。'],
      ['建筑风格与设计思潮', '理论', '可发展图型', 'Growth-ready patterns', '路易斯·康的设计理念。', '代表作为理查德医学院研究楼，塔楼的布局采用了可发展图型，为日后的扩展做下准备条件。'],
      ['建筑风格与设计思潮', '可持续', '绿色建筑', 'Green Building', '指对环境无害，能充分利用环境自然资源的一种建筑。', '又可称为可持续发展建筑、生态建筑。以人、建筑和自然环境的协调发展为目标。'],
      ['建筑风格与设计思潮', '流派', 'MIAR', 'MIAR', '意大利理性主义运动，由特拉尼发起。', '主张运用材料时应该忠实简洁，认为新的建筑应是逻辑和理性结合的产物。'],
      ['建筑风格与设计思潮', '可持续', '生态建筑', 'Ecological Architecture', '根据当地自然生态环境，运用生态学原理设计的建筑。', '使建筑和环境之间成为一个有机的结合体，形成良性循环系统。'],
      ['建筑风格与设计思潮', '流派', '提契诺学派', 'Ticino School', '瑞士南部提契诺地区的建筑学派。', '尝试将历史传统与现代建筑结合。代表人物：博塔。'],
      ['建筑风格与设计思潮', '当代', '新现代主义建筑', 'Neo-Modernism', '继承和发展现代派设计语言的倾向，又称白色派。', '强调多样化表达、纯粹化、净化和表现意味。代表人物：R.迈耶。'],
      ['建筑风格与设计思潮', '后现代', '隐喻主义', 'Metaphoric Architecture', '注重建筑语义的象征作用，运用暗示、联想手法。', '强调建筑是历史文化的组成部分，应该表现人文、地理和历史的延续性。'],
      ['建筑风格与设计思潮', '理论', '装饰就是罪恶', 'Ornament is Crime', '维也纳分离派建筑师洛斯提出的观点。', '主张与传统分离，反对装饰，认为建筑应以形体自身之美为美。'],
      ['建筑风格与设计思潮', '展览', '维森霍夫曼试验住宅展', 'Weissenhof Estate', '由德意志制造联盟策划的国际现代建筑展。', '是现代建筑发展的重要里程碑，奠定了战后控制世界建筑的基本方向的“国际式风格”。'],
      ['建筑风格与设计思潮', '建筑师', '卒姆托', 'Peter Zumthor', '极少主义建筑师，2009年普利兹克奖得主。', '探索建筑本质和纯净形式，代表作有瓦尔斯温泉浴场。'],

      // ================= 8. 城市规划与公共空间 (Expanded from PDF) =================
      ['城市规划与公共空间', '基本概念', '聚落', 'Settlement', '集中修建房屋住所的人类日常聚居的地方的统称。', '包括城市和乡村两大类。'],
      ['城市规划与公共空间', '基本概念', '居民点', 'Settlement', '按照生产和生活需要形成的人类集聚定居地点。', '按性质和人口规模，分为城市和乡村两大类。在规划中也特指规划指定的乡村型集中居住社区。'],
      ['城市规划与公共空间', '基本概念', '城市', 'City/Urban', '以非农产业和一定规模的非农人口集聚为主要特征的聚落。', '在中国通常也指按国家行政建制设立的市，或其所辖的市区。'],
      ['城市规划与公共空间', '基本概念', '城市化', 'Urbanization', '又称“城镇化”。人类生产和生活方式由乡村型向城市型转化的过程。', '表现为乡村人口向城市人口转化以及城市不断发展和完善的过程。'],
      ['城市规划与公共空间', '基本概念', '城市群', 'Urban Cluster', '一定地域范围内空间接近、社会经济联系紧密的多个城市组成的区域形态。', '又称城市聚集区（Urban Agglomeration）。'],
      ['城市规划与公共空间', '基本概念', '都市圈', 'Metropolitan Circle', '具有圈层形态的都市区。', '通常以一个特大城市为核心，与周围地区保持强烈的社会经济联系。'],
      ['城市规划与公共空间', '基本概念', '中心城市', 'Central City', '一定区域范围内处于重要地位，具有综合功能或多种主导功能的城市。', '对其他城市具有强大吸引力和辐射力的城市。'],
      ['城市规划与公共空间', '基本概念', '行政区划', 'Administrative Regionalization', '国家为了进行分级管理而将国家的主权空间地域划分为大小不同、层次不同的部分。', '并设置相应行政管理机构的区域划分。'],
      ['城市规划与公共空间', '基本概念', '城市化地区', 'Urbanized Area', '依据城市地域景观所划定的一种地理统计单元。', '主要用于反映城市人口集中的城市连片地区。'],
      ['城市规划与公共空间', '规划体系', '城乡规划', 'Urban and Rural Planning', '对学科和实践领域的统称。', '指对一定时期内城乡经济和社会发展、土地使用、空间布局以及各项建设的综合部署、具体安排和实施管理。'],
      ['城市规划与公共空间', '规划体系', '城市规划', 'Urban Planning', '对一定时期内城市的经济和社会发展、土地使用、空间布局以及各项建设的综合部署。', '具体安排和实施管理。近代曾称“都市计划”、“市镇计划”。'],
      ['城市规划与公共空间', '规划体系', '城市总体规划纲要', 'City Comprehensive Planning Outline', '确定城市总体规划的重大原则性问题的纲领性文件。', '是编制城市总体规划的依据。'],
      ['城市规划与公共空间', '规划体系', '城市总体规划', 'City Comprehensive Planning', '对一定时期内城市性质、发展目标、发展规模、土地使用、空间布局以及各项建设的综合部署和实施措施。', '是指导城市建设和发展的基本依据。'],
      ['城市规划与公共空间', '规划体系', '分区规划', 'District Planning', '根据城市总体规划，对划定的分区在土地使用、人口分布、公共设施、城市基础设施配置等方面进行进一步安排的规划。', '介于总体规划和详细规划之间。'],
      ['城市规划与公共空间', '规划体系', '详细规划', 'Detailed Planning', '以总体规划为依据，对局部地区的土地使用、空间环境和各项建设用地所做的具体安排。', '包括控制性详细规划和修建性详细规划。'],
      ['城市规划与公共空间', '规划体系', '控制性详细规划', 'Regulatory Detailed Planning', '以总体规划为依据，对特定地区内的用地进行地块划分，并提出具体土地使用性质、使用强度、公共服务设施配套、道路交通和工程管线以及空间环境控制的规划控制要求。', '是规划管理的主要依据。'],
      ['城市规划与公共空间', '规划体系', '修建性详细规划', 'Constructive Detailed Planning', '以控制性详细规划为依据，对建设地段制定的用以指导各项建筑和工程设施的设计及施工的规划设计。', '内容更具体，包括建筑布局、环境设计等。'],
      ['城市规划与公共空间', '规划体系', '城市设计导则', 'Urban Design Guideline', '城市设计中制定的专门用于引导城市开发建设的各项设计准则的统称。', '包括图纸与文字条款。'],
      ['城市规划与公共空间', '规划体系', '土地使用规划', 'Land Use Planning', '又称“土地利用规划”。城市规划的核心内容。', '以特定区域内全部土地为对象，明确未来土地使用方式，统筹各类用地之间关系，并实施开发控制的规划。'],
      ['城市规划与公共空间', '理论与方法', '理性规划', 'Rational Planning', '以理性思考为基础进行的规划，其核心是基于现有的科学理论。', '通过合理的逻辑推导而不是通过个人的好恶偏好来指导未来的行动。'],
      ['城市规划与公共空间', '理论与方法', '区位理论', 'Location Theory', '又称“区位经济论”。关于经济活动空间位置选择规律的理论。', '探讨区位因素对经济活动布局的影响过程和经济活动最优区位选择的理论。'],
      ['城市规划与公共空间', '理论与方法', '核心-边缘理论', 'Core-Periphery Theory', '在区域非均衡发展的格局中，揭示了核心区对边缘区产生支配作用的一种理论。', '解释了区域发展不平衡的动态过程。'],
      ['城市规划与公共空间', '理论与方法', '集聚效应', 'Concentration Effect', '人口或经济活动向特定地区集中并产生经济优势的现象。', '是城市形成和发展的重要动力。'],
      ['城市规划与公共空间', '理论与方法', '中心地理论', 'Central Place Theory', '由德国地理学家克里斯泰勒提出的一种关于大区域范围内城市布局的理论。', '揭示了城市体系以中心城市为核心呈等级化、秩序化分布的规律特点。'],
      ['城市规划与公共空间', '理论与方法', '希波丹姆规划模式', 'Hippodamian Plan', '古希腊学者希波丹姆提出的以格网道路布局为骨架的规划形式。', '城市形成秩序化布局的形式，最早在理论上阐述并在城市重建中运用，被誉为“城市规划之父”。'],
      ['城市规划与公共空间', '理论与方法', '理想城市', 'Ideal City', '基于特定哲学思想、社会理想或科学技术而建构或想象的完美城市的统称。', '如文艺复兴时期许多学者提出的一种城市模式，城市呈规则的几何化平面布局。'],
      ['城市规划与公共空间', '理论与方法', '空想社会主义城市规划', 'Utopian Urban Planning', '又称“乌托邦城市规划”。', '19世纪初以空想社会主义为内涵的一种城市规划思潮。'],
      ['城市规划与公共空间', '理论与方法', '城市美化运动', 'City Beautiful Movement', '19世纪末至20世纪初，美国以改善城市景观环境来解决城市快速发展中物质空间和社会空间问题的运动。', '强调宏大的视觉效果和纪念性。'],
      ['城市规划与公共空间', '理论与方法', '带形城市理论', 'Linear City Theory', '由西班牙索里亚·伊·马塔提出的一种城市空间组织理论。', '城市建成区沿着主要交通轴线呈条带状连续延展。'],
      ['城市规划与公共空间', '理论与方法', '田园城市理论', 'Garden City Theory', '19世纪末由英国霍华德提出的城市规划布局模式。', '城市由一系列的同心圆组成，可分为市中心区、居住区、工业仓库等地带，被永久性绿地包围。'],
      ['城市规划与公共空间', '理论与方法', '有机疏散理论', 'Organic Decentralization Theory', '沙里宁提出的一种关于城市发展及其布局调整的理论。', '主张通过合理有序的要素集聚或疏散来解决大城市发展中的问题。'],
      ['城市规划与公共空间', '理论与方法', '芝加哥学派', 'Chicago School', '美国城市社会学的一个流派，以人文生态学的思想来研究城市的社会问题及其空间机制过程。', '代表人物包括帕克、伯吉斯等。'],
      ['城市规划与公共空间', '理论与方法', '同心圆理论', 'Concentric Zone Model', '美国学者伯吉斯提出的关于城市内部结构的一种理论。', '揭示城市地域以市中心为圆心呈圈层地带状分布的空间格局。'],
      ['城市规划与公共空间', '理论与方法', '扇形理论', 'Sector Model', '美国学者霍伊特提出的关于城市内部结构的一种理论。', '揭示从城市中心出发沿主要交通干线或障碍最小的方向呈扇面状向外延伸分布的空间格局。'],
      ['城市规划与公共空间', '理论与方法', '多核心理论', 'Multiple Nuclei Model', '美国学者哈里斯和乌尔曼提出的关于城市内部结构的一种理论。', '揭示城市中存在若干个中心并围绕这些中心发展所组成的空间格局。'],
      ['城市规划与公共空间', '理论与方法', '邻里单位', 'Neighborhood Unit', '美国学者佩里提出的一种居住区规划模式。', '以小学的服务范围来组织居住区的基本单元。'],
      ['城市规划与公共空间', '理论与方法', '卫星城', 'Satellite Town', '为分散中心城市过于集聚的人口和产业，在大城市周围地区新建或扩建的独立城镇。', '承担中心城市某些职能或为中心城市服务。'],
      ['城市规划与公共空间', '理论与方法', '雷德朋原则', 'Radburn Principle', '美国规划师克拉伦斯·斯坦提出的一种居住区布局模式。', '将居住区道路按功能划分为不同类型和若干等级，通过建立人车完全分离的体系来解决居住区内的活动干扰问题。'],
      ['城市规划与公共空间', '理论与方法', '光辉城市', 'Radiant City', '法国勒·柯布西耶提出的关于现代城市集聚发展的模式。', '主张通过立体式交通和提高城市密度来解决城市问题，以获得更高效、更舒适的生活。'],
      ['城市规划与公共空间', '理论与方法', '广亩城市', 'Broadacre City', '英国建筑师赖特提出的一种城市功能布局思想。', '解体传统集聚发展的城市形态，倡导高度分散的布局模式。'],
      ['城市规划与公共空间', '理论与方法', '功能分区', 'Functional Zoning', '现代城市规划布局的主要方式之一。', '根据城市中的各种活动类型的特点与需求，将城市用地按主要功能在空间上进行划分。'],
      ['城市规划与公共空间', '理论与方法', '绿带', 'Green Belt', '城市中带状连续分布的绿色空间。', '为阻止城市蔓延而在城市建成区外围划定的非城市建设地带。'],
      ['城市规划与公共空间', '理论与方法', '城市意象', 'City Image', '凯文·林奇提出的概念。', '通过对道路、节点、边界、地标和区域等要素，人群建立起的对城市的综合感知和印象。'],
      ['城市规划与公共空间', '理论与方法', '雅典宪章', 'Charter of Athens', '1933年国际建筑协会通过的关于城市规划理论和方法的纲领性文件。', '全面确立了现代主义城市规划的认识论和方法论。'],
      ['城市规划与公共空间', '理论与方法', '马丘比丘宪章', 'Charter of Machu Picchu', '1977年国际建筑协会通过的城市规划纲领性文件。', '对《雅典宪章》所提出的现代功能主义理性思想进行的全面修正与发展。'],
      ['城市规划与公共空间', '理论与方法', '城市蔓延', 'Urban Sprawl', '城市空间增长的一种形式，特指一种低密度、分散化的城市扩张方式。', '常导致土地浪费和交通拥堵。'],
      ['城市规划与公共空间', '理论与方法', '新城市主义', 'New Urbanism', '美国学者针对现代主义城市功能规划问题，提出的关于城市内部和郊区紧凑发展以恢复城市社区活力的一系列设计理念。', '强调步行、混合功能和社区归属感。'],
      ['城市规划与公共空间', '理论与方法', 'TOD', 'Transit Oriented Development', '公交导向型发展。以公共交通为引导的城市发展模式。', '通常以公交站点为中心，适宜的步行距离为半径，强调多种功能的混合开发。'],
      ['城市规划与公共空间', '理论与方法', '精明增长', 'Smart Growth', '针对城市蔓延危机，通过改变传统空间增长方式，促进特定地域内的紧凑发展。', '以实现城市与郊区协同、增强地方归属感、保护自然文化资源、提高开发利益等综合目标的一种空间发展模式。'],
      ['城市规划与公共空间', '理论与方法', '生态城市', 'Eco-city', '社会、经济、自然协调发展，物质、能量、信息高效利用，技术、文化与景观充分融合的人类聚居地。', '生态良性循环的集约型人类聚居地。'],
      ['城市规划与公共空间', '理论与方法', '紧凑城市', 'Compact City', '针对城市无序蔓延提出来的城市可持续发展理念模式。', '强调通过土地资源的混合使用、密集开发等策略，提高城市土地的利用效率和城市发展的品质。'],
      ['城市规划与公共空间', '理论与方法', '海绵城市', 'Sponge City', '利用城市的自然条件与工程措施调剂雨水的蓄存与释放。', '来应对雨水自然灾害的城市建设理念。'],
      ['城市规划与公共空间', '理论与方法', '韧性城市', 'Resilient City', '城市应对自然灾害的恢复能力。', '城市应对自然和人为灾害具有可承受、适应性和可恢复性的能力。'],
      ['城市规划与公共空间', '理论与方法', '智慧城市', 'Smart City', '以数字化、网络化和智能化的信息通信技术设施为基础。', '以社会、环境、管理为核心要素的当代城市发展理念与实践。'],
      ['城市规划与公共空间', '城市设计', '城市景观', 'Cityscape', '人类在城市聚居环境中所创造和维护的人工与自然景观。', '由城市建筑和建筑群、街道、广场、园林绿化等形成的外观整体及氛围。'],
      ['城市规划与公共空间', '城市设计', '建成环境', 'Built Environment', '人类生产、生活活动而形成的人居环境状态。', '范围上从聚落整体到具体建筑物，同时也包括各种支持性基础设施。'],
      ['城市规划与公共空间', '城市设计', '中央商务区', 'CBD', '大城市中商务、金融、贸易、信息功能高度集中布局的地区。', '具有综合经济特征的核心地区。'],
      ['城市规划与公共空间', '城市设计', '中央活动区', 'CAZ', '中央商务区（CBD）概念的扩展。', '强调融合商务行政、休闲娱乐文化、高品质居住、旅游观光等多种功能和活动集中，注重多样性、充满活力和空间人性化的规划分区。'],
      ['城市规划与公共空间', '城市设计', '城市原型', 'Urban Archetype', '由于宗教、政治、自然、文化、军事等原因或某种城市设计理论而形成的明确的城市形制。', '城市设计的基础模型。'],
      ['城市规划与公共空间', '城市设计', '城市天际线', 'City Skyline', '以天空为背景，由城市建筑物及其他物质环境要素形成的城市立面轮廓线。', '通常由城市的地形环境、自然植被、建筑物及高耸构筑物等的最高边界线组成。'],
      ['城市规划与公共空间', '城市设计', '城市肌理', 'Urban Fabric', '由路网、院落、建筑群、环境等不同密度、形式、材质的城市物质要素组合形成的城市空间组织关系。', '反映城市的组织结构和纹理。'],
      ['城市规划与公共空间', '城市设计', '城市文脉', 'Urban Context', '建筑与周围环境的关系。其形成在历史、社会、文化、时间等维度上存在着发展的连续性。', '体现城市历史文化的延续。'],
      ['城市规划与公共空间', '城市设计', '图底关系', 'Figure-Ground', '城市实体要素与开敞空间之间所形成的“图形与背景”的相互映衬关系。', '用于分析城市空间结构。'],
      ['城市规划与公共空间', '城市设计', '空间句法', 'Space Syntax', '以空间认知抽象和空间组构分析为基础，通过量化研究空间网络局部与整体的内在关系。', '揭示空间自律性以及空间与社会之间关联性的理论和方法。'],
      ['城市规划与公共空间', '城市设计', '城市触媒', 'Urban Catalyst', '能够引起和激发多项后续项目开发连锁反应的重大城市设施或活动。', '如大型博物馆、体育场馆等对周边区域的带动作用。'],
      ['城市规划与公共空间', '城市设计', '开放空间', 'Open Space', '又称“开敞空间”。城市中非建筑实体占用或建筑实体较少，向公众开放的空间。', '包括公园、广场、街道等。'],
      ['城市规划与公共空间', '城市设计', '公共空间', 'Public Space', '向所有城市居民开放，为公众共同使用的城市空间。', '如街道、广场、公园等。'],
      ['城市规划与公共空间', '城市设计', '场所精神', 'Genius Loci', '场所中，能让使用者产生认同感与归属感的内在品质。', '不仅是物理空间，更是具有独特氛围和特征的存在。'],
      ['城市规划与公共空间', '城市设计', '广场', 'Square', '为满足社会需要建设的具有一定功能和规模的开放型城市户外活动空间。', '主要由硬质铺装构成。'],
      ['城市规划与公共空间', '城市设计', '地标', 'Landmark', '具有鲜明特色且易被人识别的建（构）筑物或自然物。', '在城市空间中起到导向和定位作用。'],
      ['城市规划与公共空间', '城市设计', '街区', 'Block', '又称“街廓”。城镇中通过街道或自然地物边界（如河流）等所界定的基本单元地段。', '城市形态的基本组成部分。'],
      ['城市规划与公共空间', '城市设计', '街道设施', 'Street Furniture', '又称“街道家具”。沿道路布置的各类服务性设施。', '包括各类休憩设施、康体设施、城市雕塑、公用电话、公交站点、照明设施、应急设施等。'],
      ['城市规划与公共空间', '城市设计', '城市第五立面', 'The Fifth Facade', '从空中俯瞰到的城市建（构）筑物、自然环境、树木植被等构成的整体景象。', '即城市的屋顶和鸟瞰景观。'],
      ['城市规划与公共空间', '城市设计', '林荫道', 'Boulevard', '两旁植有成排乔木，树荫遮蔽的城市景观道路。', '提供舒适的步行和休憩环境。'],
      ['城市规划与公共空间', '规划指标', '容积率', 'Plot Ratio / FAR', '地块内建筑总面积与用地面积的比值。', '是衡量土地开发强度的重要指标。'],
      ['城市规划与公共空间', '规划指标', '建筑密度', 'Building Density', '一定地块内所有建筑物的基底总面积占总用地面积的比值。', '反映建筑用地的密集程度。'],
      ['城市规划与公共空间', '规划指标', '红线', 'Boundary Line', '各类建设工程项目用地使用权属范围的边界线。', '包含用地红线和道路红线。'],
      ['城市规划与公共空间', '规划指标', '道路红线', 'Road Boundary Line', '由规划确定的城市道路用地的边界线。', '城市道路用地内包括车行道、人行道、道路绿化等。'],
      ['城市规划与公共空间', '规划指标', '建筑控制线', 'Building Control Line', '又称“建筑红线”。地块内建筑物、构筑物布置不得超出的界线。', '通常从道路红线后退一定距离。'],
      ['城市规划与公共空间', '规划指标', '日照间距', 'Insolation Standard', '为保证建筑室内环境的卫生条件而确定的有效日照时间的最低限度。', '即根据建筑物所处的气候区、城市规模和建筑物的使用性质确定的，在日照标准日的有效日照时段内阳光应直接照射到建筑物室内的最低日照时数。'],
      ['城市规划与公共空间', '规划指标', '城市紫线', 'Urban Purple Line', '历史文化街区以及历史文化街区外历史建筑的保护范围界线。', '用于保护城市历史文化遗产。'],
      ['城市规划与公共空间', '规划指标', '城市绿线', 'Urban Green Line', '城市规划确定的各类城市绿地边界控制线。', '用于保障城市绿地系统的建设和保护。'],
      ['城市规划与公共空间', '规划指标', '城市蓝线', 'Urban Blue Line', '城市规划确定的江、河、湖、库、渠和湿地等城市地表水体保护和控制的地域界线。', '用于保护城市水系。'],
      ['城市规划与公共空间', '规划指标', '城市黄线', 'Urban Yellow Line', '城市规划确定的对城市发展全局有影响的城市基础设施用地的控制界线。', '用于保障城市基础设施的建设。'],
      ['城市规划与公共空间', '规划指标', '开发强度', 'Development Density', '（1）在地块开发控制中，将容积率和建筑密度统称为开发强度。（2）一定区域内建筑物和构筑物的总面积占该区域总面积的比例。', '（3）在主体功能区规划、国土空间规划中，指建设用地面积与区域总面积的比例。'],
      ['城市规划与公共空间', '交通与工程', '交通稳静化', 'Traffic Calming', '为减少机动车使用产生的负面影响、改善步行与非机动车使用环境而采取的一系列物理措施的组合。', '常用的交通稳静化措施主要包括凸起型交叉口、交叉口瓶颈化、行车道窄化、织纹路面、减速台等。'],
      ['城市规划与公共空间', '交通与工程', '停车视距', 'Stopping Sight Distance', '汽车行驶时，驾驶人员自看到前方障碍物时起，至达到障碍物前安全停止，所需的最短行车距离。', '保障行车安全的重要指标。'],
      ['城市规划与公共空间', '交通与工程', '视距三角形', 'Sight Triangle', '为保证交叉口处的行车安全，由两条相交道路上直行车辆的停车视距和视线所构成的三角形空间和限界。', '在此范围内不得有阻挡视线的障碍物。'],
      ['城市规划与公共空间', '交通与工程', '综合管廊', 'Utility Tunnel', '建于城市地下用于容纳两种及以上城市工程管线的构筑物及附属设施。', '便于管线的铺设、维修和管理，减少道路挖掘。'],
      ['城市规划与公共空间', '技术科学', '地理信息系统', 'GIS', '在计算机软、硬件支持下，对空间数据进行采集、编码、处理、存贮、分析、输出的人机交互信息系统。', '广泛应用于城市规划、土地管理等领域。'],
      ['城市规划与公共空间', '技术科学', '城市风廊', 'Urban Wind Corridor', '以提升城市的空气流动，缓解热岛效应和改善人体舒适度为目的，为城区引入新鲜空气而构建的通道。', '利用自然风改善城市微气候。'],
      ['城市规划与公共空间', '技术科学', '街道峡谷', 'Street Canyon', '城市中由街道及两侧一系列相对连续的建筑界面形成的、类似于峡谷的街道空间形态。', '影响街道的通风和日照环境。'],
      ['城市规划与公共空间', '社会与实施', '绅士化', 'Gentrification', '又称“中产阶级化”。（1）城市中相对贫困或衰败的地区，因中产阶级家庭的不断迁入而导致房地产价值提升。', '迫使原居民或企业、机构不断搬出和被置换的过程。（2）城市改造中，拆除或改造相对衰败的住房与设施，形成满足中产阶级生活需要的社区的过程。'],
      ['城市规划与公共空间', '社会与实施', '城中村', 'Urban Village', '在城市扩展过程中，村庄的耕地被征用为国有土地进行城市开发。', '原村庄聚落仍保持集体土地性质，并被城市建设用地包围，成为都市里的村庄。'],
      ['城市规划与公共空间', '社会与实施', '防卫空间', 'Defensible Space', '有助于降低犯罪发生率，增加使用者安全感的公共空间或半公共空间。', '通过空间设计提高环境的可监视性和领域感。'],
      ['城市规划与公共空间', '社会与实施', '邻避设施', 'NIMBY Facility', '一些对于社会运行必不可少，但又容易引发当地居民、组织或机构担心对身体健康、环境质量和资产价值等带来负面影响并进而引发社会矛盾的公共设施。', '如垃圾回收站、垃圾填埋场、核电厂、殡仪馆等。'],
      ['城市规划与公共空间', '社会与实施', '城市更新', 'Urban Regeneration', '（1）基于城市产业转型、功能提升、设施优化等原因，对城市建成区进行整治、改造与再开发的规划建设活动和制度。', '（2）特指美国在 1950 年代指 1970 年代由联邦政府资助城市政府以清除贫民窟为主要目标的大规模城市改造。'],
      ['城市规划与公共空间', '社会与实施', '棕地更新', 'Brownfield Regeneration', '对受污染的工业用地或废弃地进行污染治理、开发、改造和再次利用的城市更新活动。', '旨在恢复土地价值和改善环境。'],

      // 7. 可持续与绿色建筑 (Expanded with detailed terms from PDF)
      ['可持续与绿色建筑', '节能技术', '建筑围护结构节能优化', 'Envelope Energy Optimization', '通过优化建筑朝向、体形、窗墙比及材料构造来降低建筑能耗的技术。', '影响因素包括体形系数、传热系数、遮阳度等。墙体节能分为外保温、内保温、自保温和夹芯保温四种。屋面节能包括绿化屋面、蓄水屋面、通风屋面和冷屋面（反射涂料）。门窗节能约占围护结构能耗的70%，关键措施包括控制窗墙比、采用Low-E中空玻璃及断热窗框、设置遮阳等。'],
      ['可持续与绿色建筑', '节能技术', '墙体节能', 'Wall Energy Efficiency', '主要技术是保温隔热，根据构造形式分为外墙外保温、外墙自保温、外墙内保温和夹芯保温。', '外墙外保温（如EPS/XPS板）存在剥离隐患但热桥少；内保温热桥多；自保温（如加气混凝土砌块）常用材料是轻质混凝土，施工简便；夹芯保温在墙体中间填充材料，冷热桥现象严重。'],
      ['可持续与绿色建筑', '节能技术', '外墙外保温', 'External Insulation', '将保温材料置于墙体的外侧，主要材料是膨胀聚苯乙烯（EPS）板、挤塑聚苯乙烯（XPS）板。', '优点是保护主体结构，减少热桥；缺点是存在保温层剥离的安全隐患。'],
      ['可持续与绿色建筑', '节能技术', '外墙内保温', 'Internal Insulation', '将保温材料置于墙体的内侧，常用贴挂聚苯板或内刷保温砂浆。', '优点是施工方便，造价低；缺点是热桥现象严重，容易结露，且占用室内面积。'],
      ['可持续与绿色建筑', '节能技术', '外墙自保温', 'Self-insulation', '以具有保温效果的材料（如加气混凝土、空心砌块）作为墙体材料。', '常用材料包括轻集料混凝土、陶粒混凝土空心砌块等。在夏热冬暖地区（如岭南）应用广泛，施工容易，造价较低。'],
      ['可持续与绿色建筑', '节能技术', '夹芯保温', 'Sandwich Insulation', '在墙体中间填充保温材料构成复合墙体。', '虽然起到保温作用，但冷热桥现象严重，抗震性能较差，施工相对复杂。'],
      ['可持续与绿色建筑', '节能技术', '屋面节能', 'Roof Energy Efficiency', '通过构造与材料选择减少屋面传热，能耗占围护结构的5%～10%。', '除了常规保温（聚苯板、珍珠岩），还有绿化屋面（利用植物蒸腾）、蓄水屋面（水蒸发散热）、通风屋面（空气层隔热）和冷屋面（反射涂料）等形式。需特别注意温度骤变引起的防水问题。'],
      ['可持续与绿色建筑', '节能技术', '绿化屋面', 'Green Roof', '在屋面种植植物，利用植物的蒸腾作用和遮挡太阳辐射来降低屋面温度。', '能有效避免房间过热，改善城市微气候，缓解热岛效应。'],
      ['可持续与绿色建筑', '节能技术', '蓄水屋面', 'Water Storage Roof', '在屋面蓄积一定深度的水，利用水的蒸发带走热量，减少太阳辐射得热。', '适用于夏季隔热，但需注意防漏和防蚊虫滋生。'],
      ['可持续与绿色建筑', '节能技术', '通风屋面', 'Ventilated Roof', '在屋面设置架空通风层，利用空气对流带走热量进行保温隔热。', '适用于夏热冬暖地区，结构简单，隔热效果好。'],
      ['可持续与绿色建筑', '节能技术', '冷屋面', 'Cool Roof', '在屋面涂刷热反射涂料，提高屋面对太阳光的反射率，减少热量吸收。', '能显著降低屋面表面温度，减少空调能耗。'],
      ['可持续与绿色建筑', '节能技术', '门窗节能', 'Window Energy Efficiency', '针对能耗薄弱环节（占70%能耗）采取的加强措施。', '措施包括：控制窗墙面积比；采用断热铝合金/PVC/玻璃钢窗框；使用Low-E中空玻璃或镀膜玻璃；设置遮阳设施（特别是东、西向）。'],
      ['可持续与绿色建筑', '分析技术', '建筑物理环境模拟优化', 'Physical Simulation', '利用仿真软件对建筑的热、光、声、风环境进行模拟分析。', '内容包括：场地风环境（风速/风压云图）、室内自然通风（空气龄/换气次数）、室内自然采光（采光系数）、场地日照（日照时数/辐射量）及全年能耗模拟。常用软件：PKPM、PBECA。'],
      ['可持续与绿色建筑', '分析技术', '场地风环境模拟', 'Wind Environment Simulation', '模拟冬季、夏季及过渡季下的场地风速和风压分布。', '输出结果包括风速矢量图、风速放大系数云图等，用于评估行人舒适度和建筑防风性能。'],
      ['可持续与绿色建筑', '分析技术', '室内自然通风模拟', 'Natural Ventilation Simulation', '输出各户型的自然通风报告，包括风速云图、空气龄云图及换气次数。', '评估室内空气流通情况，优化门窗开启位置和大小。'],
      ['可持续与绿色建筑', '分析技术', '室内自然采光模拟', 'Daylighting Simulation', '分析建筑各平面的采光系数、采光品质判定及达标率。', '通过模拟优化窗户设计，减少人工照明能耗，提高视觉舒适度。'],
      ['可持续与绿色建筑', '分析技术', '场地日照模拟', 'Sunlight Simulation', '分析日照时长、阴影遮挡及辐射量，通常由方案设计团队完成。', '确保建筑满足国家日照标准，并优化太阳能利用潜力。'],
      ['可持续与绿色建筑', '分析技术', '全年能耗模拟', 'Energy Simulation', '模拟建筑全年的分项能耗值及整体能耗值。', '计算围护结构节能率、空调系统节能率，是绿色建筑评价的重要依据。'],
      ['可持续与绿色建筑', '设备系统', '高效空调机组', 'Efficient HVAC Unit', '由压缩机、热回收换热器、四通阀等组成的高效系统。', '功能包括：夏天风冷制冷，全热回收制取卫生热水；冬季利用空气源热泵原理采暖。显著降低空调能耗。'],
      ['可持续与绿色建筑', '设备系统', '高效光源', 'Efficient Light Source', '指效率高、寿命长、性能稳定的照明产品，如紧凑型荧光灯(T5/T8)、金卤灯等。', '配合高效电子镇流器、反射器及智能控制系统（声控/红外/时间控制），实现照明节能。'],
      ['可持续与绿色建筑', '水资源利用', '雨水收集系统', 'Rainwater Harvesting', '集中收集屋面和道路雨水，经过滤消毒后回用的系统。', '用途：绿化灌溉、冲洗道路、生活杂用、循环冷却。利用方式分为直接利用（收集储存）和间接利用（入渗回补地下水）。雨水水质优于污水且免费，具有生态和经济双重效益。'],
      ['可持续与绿色建筑', '水资源利用', '中水回用', 'Greywater Recycling', '将生活杂排水（沐浴、洗衣、空调冷凝水）经处理达标后重复利用。', '主要用于冲厕、绿化、洗车等非饮用用途。回收方式有小区统一回收和住户分户回收。中水水质介于上水与下水之间，是解决城市缺水的有效途径。'],
      ['可持续与绿色建筑', '水资源利用', '节水器具', 'Water-saving Appliances', '在满足使用功能前提下显著减少用水量的器具。', '例如：一次冲洗水量≤6L的节水便器（两档冲水）、陶瓷阀芯节水水嘴、红外感应洁具。同时需配合给水系统的减压限流措施，避免超压出流。'],
      ['可持续与绿色建筑', '可再生能源', '地源热泵系统', 'Ground Source Heat Pump', '利用地下岩土体、地下水或地表水作为低温热源/热汇的高效供热空调系统。', '形式：地埋管（土壤源）、地下水地源、地表水地源。它不排放废气废水，被称为“绿色空调”，适用于多种气候区。'],
      ['可持续与绿色建筑', '结构优化', '结构优化设计技术', 'Structural Optimization', '通过对地基、体系和构件的优化，在保证安全的前提下降低造价和材耗。', '钢筋混凝土工程造价每平米可节省60-170元。是绿色建筑节材的重要内容。'],
      ['可持续与绿色建筑', '结构优化', '地基基础优化', 'Foundation Optimization', '在基础设计的安全性和经济性之间寻求合理平衡点。', '通过结构计算验证基础方案，合理选用材料，避免过度设计导致的基础厚重和浪费。'],
      ['可持续与绿色建筑', '结构优化', '结构体系优化', 'Structural System Optimization', '优先采用传力明确、受力简单的结构形式。', '原则：横墙承重或纵横共同承重；剪力墙布置均匀对称、竖向连续；避免上刚下柔；优先采用钢结构等绿色建材体系。'],
      ['可持续与绿色建筑', '结构优化', '结构构件优化', 'Component Optimization', '对单体构件（梁、板、柱）进行定量分析和精细化设计。', '控制钢筋强度、混凝土性能、构件截面尺寸；减少不具备实用功能的装饰性构件；关注轴压比、层间位移角等指标的合理性。'],

      // ================= 5. 结构与构造理论 (Expanded from PDF) =================
      ['结构与构造理论', '结构基础', '建筑结构', 'Building Structure', '保持建筑物的外部形态并行成内部空间的骨架。', '建筑物中起支撑和传递荷载作用的体系。'],
      ['结构与构造理论', '结构基础', '设计基准期', 'Design Reference Period', '建筑结构设计所采用的荷载统计参数、和时间有关的材料性能取值都需要一个时间参数。', '通常为50年。'],
      ['结构与构造理论', '结构基础', '设计使用年限', 'Design Working Life', '结构在规定条件下不需要大修即可按预定目的使用的时期。', '分为临时结构(5年)、易替换结构(25年)、普通房屋(50年)、纪念性建筑(100年)。'],
      ['结构与构造理论', '结构基础', '作用', 'Action on Structure', '指结构产生作用效应的总和。', '作用效应包括内力（N、M、Q、T）和变形（挠度、转角和裂缝等）。'],
      ['结构与构造理论', '结构基础', '荷载', 'Load', '凡施加在结构上的集中力或分布力，属于直接作用。', '如恒载、活载。'],
      ['结构与构造理论', '结构基础', '间接作用', 'Indirect Action', '凡引起结构外加变形或约束变形的原因。', '如基础沉降、地震作用、温度变化、材料收缩、焊接等。'],
      ['结构与构造理论', '结构基础', '结构抗力', 'Structural Resistance', '结构或结构构件承受作用效应的能力。', '主要由材料强度和截面几何特性决定。'],
      ['结构与构造理论', '结构基础', '结构可靠性', 'Structural Reliability', '指结构在规定的时间内，规定的条件下完成预定功能的能力。', '包括安全性、适用性和耐久性。'],
      ['结构与构造理论', '结构基础', '结构可靠度', 'Structural Reliability Degree', '指结构在规定的时间内，规定的条件下完成预定功能的概率。', '是结构可靠性的概率度量。'],
      ['结构与构造理论', '结构基础', '荷载标准值', 'Characteristic Load Value', '在结构使用期间正常情况下可能出现的最大荷载值。', '包括永久荷载标准值和可变荷载标准值。'],
      ['结构与构造理论', '结构基础', '荷载代表值', 'Representative Load Value', '荷载在设计基准期内量值的代表，包括标准值、组合值、频遇值和准永久值。', '可变荷载的组合值用于承载力极限状态；频遇值和准永久值用于正常使用极限状态。'],
      ['结构与构造理论', '结构基础', '内力重分布', 'Force Redistribution', '超静定结构中，由于材料非线性或塑性铰的出现，改变了结构的刚度分布，导致内力重新分配的现象。', '允许结构充分利用材料潜力。'],
      ['结构与构造理论', '结构基础', '塑性铰', 'Plastic Hinge', '适筋截面在钢筋屈服到混凝土压碎过程中出现的具有一定转动能力的区域。', '能传递一定弯矩但刚度极小，是内力重分布的关键。'],
      ['结构与构造理论', '结构基础', '承重结构', 'Load-bearing Structure', '由各种块材和砂浆砌筑而成的结构（特指砌体结构语境）。', '直接承受荷载的结构体系。'],
      ['结构与构造理论', '混凝土与砌体', '立方体抗压强度', 'Cubic Compressive Strength', '规定以边长为150mm的立方体在标准条件下养护28d测得的具有95%保证率的抗压强度。', '用fcu表示，是混凝土强度等级划分的依据。'],
      ['结构与构造理论', '混凝土与砌体', '混凝土变形', 'Concrete Deformation', '混凝土在荷载或环境作用下产生的形状或体积变化。', '包括受力变形（短期/长期/重复荷载下）和体积变形（收缩/温度湿度变化）。'],
      ['结构与构造理论', '混凝土与砌体', '徐变', 'Creep', '结构承受的荷载或应力不变，而变形或应变随时间增长的现象。', '会导致预应力损失和变形增加。'],
      ['结构与构造理论', '混凝土与砌体', '收缩与膨胀', 'Shrinkage and Expansion', '混凝土在空气中硬化时体积变小的现象称为收缩。', '受温度和湿度影响产生的体积变化。'],
      ['结构与构造理论', '混凝土与砌体', '受弯构件', 'Flexural Member', '截面上通常有弯矩和剪力共同作用而轴力可以忽略不计的构件。', '如梁和板。'],
      ['结构与构造理论', '混凝土与砌体', '受弯破坏形式', 'Flexural Failure Modes', '荷载作用下受弯构件的破坏形态。', '正截面破坏：沿弯矩最大的截面破坏，与轴线垂直。斜截面破坏：沿剪力最大的截面破坏，与轴线斜交。'],
      ['结构与构造理论', '混凝土与砌体', '分布钢筋', 'Distribution Reinforcement', '垂直于受力钢筋方向上布置的构造钢筋。', '截面面积不应小于单位长度上受力钢筋截面面积的15%；且每米长度内不宜少于4根。'],
      ['结构与构造理论', '混凝土与砌体', '适筋破坏', 'Ductile Failure', '纵向受拉钢筋先屈服，受拉区的砼随后被压碎。', '破坏前有明显预兆，属于延性破坏，是设计期望的破坏形式。'],
      ['结构与构造理论', '混凝土与砌体', '少筋破坏', 'Brittle Failure (Min)', '受拉区砼一旦开裂，钢筋拉力迅速达到屈服强度并进入强化阶段。', '破坏突然，属于脆性破坏，设计中应避免。'],
      ['结构与构造理论', '混凝土与砌体', '超筋破坏', 'Brittle Failure (Max)', '受压区砼先压碎，纵向受拉钢筋不屈服，梁已告破坏。', '没有明显预兆，属于脆性破坏，设计中应避免。'],
      ['结构与构造理论', '混凝土与砌体', '矩形截面配筋', 'Rectangular Section Reinforcement', '单筋矩形截面：只在受拉区配有纵向受力钢筋。双筋矩形截面：在受拉区和受压区同时配有纵向受力钢筋。', '根据内力大小和截面限制选择。'],
      ['结构与构造理论', '混凝土与砌体', '轴心受拉构件', 'Axially Tensioned Member', '纵向拉力作用线与构件截面形心重合的构件。', '全截面受拉，裂缝贯通。'],
      ['结构与构造理论', '混凝土与砌体', '扭转', 'Torsion', '结构承受的四种基本受力状态之一（拉、压、弯、扭）。', '构件截面绕轴线旋转。'],
      ['结构与构造理论', '混凝土与砌体', '协调扭转', 'Compatibility Torsion', '超静定结构中由于变形的协调使截面产生的扭转。', '扭矩大小与构件刚度有关。'],
      ['结构与构造理论', '混凝土与砌体', '平衡扭转', 'Equilibrium Torsion', '结构的扭矩由荷载产生，可根据平衡条件求得。', '扭矩大小与构件的抗扭刚度无关。'],
      ['结构与构造理论', '混凝土与砌体', '受扭破坏形式', 'Torsional Failure Modes', '少筋受扭：脆性破坏，似少筋梁。适筋受扭：延性破坏，构件变形大。超筋受扭：脆性破坏，砼先压碎。', '设计应控制在适筋范围。'],
      ['结构与构造理论', '混凝土与砌体', '预应力混凝土', 'Prestressed Concrete', '根据需要人为地引入某一数值与分布的内应力，用以全部或部分抵消外荷载应力的一种加筋混凝土。', '利用高强材料，提高抗裂度和刚度。'],
      ['结构与构造理论', '混凝土与砌体', '预应力构件', 'Prestressed Member', '在混凝土构件承受外荷载之前，对其受拉区预先施加压应力的构件。', '通常使用高强钢筋和高强混凝土。'],
      ['结构与构造理论', '混凝土与砌体', '张拉方法', 'Tensioning Methods', '先张法：通过粘结力传递预应力；后张法：依靠锚具传递预应力。', '先张法适用于工厂预制，后张法适用于现场施工。'],
      ['结构与构造理论', '混凝土与砌体', '张拉控制应力', 'Control Stress', '张拉预应力钢筋时，张拉设备的测力仪表所指示的总张拉力除以预应力钢筋截面面积。', '是预应力设计的主要参数。'],
      ['结构与构造理论', '混凝土与砌体', '预应力损失', 'Prestress Loss', '张拉后拉应力逐渐下降到一定程度的现象。', '包括锚具变形、摩擦、温差、松弛、收缩徐变等损失。'],
      ['结构与构造理论', '混凝土与砌体', '砂浆', 'Mortar', '由胶凝材料和细骨料加水搅拌而成的混合材料。', '用于砌筑和抹灰。'],
      ['结构与构造理论', '混凝土与砌体', '配筋砌块砌体', 'Reinforced Block Masonry', '在砌块孔洞内设置纵向钢筋，水平缝处用箍筋连接，并在孔洞内浇注混凝土而形成的组合构件。', '可形成配筋砌块砌体剪力墙结构。'],
      ['结构与构造理论', '混凝土与砌体', '单向板', 'One-way Slab', '主要在一个方向弯曲的板。', '长宽比大于2或3时按单向板计算。'],
      ['结构与构造理论', '混凝土与砌体', '双向板', 'Two-way Slab', '在两个方向弯曲，且不能忽略任何一方向弯曲的板。', '长宽比接近1时按双向板计算。'],
      ['结构与构造理论', '混凝土与砌体', '混合结构', 'Mixed Structure', '指墙、柱、基础等竖向构件采用砌体材料，楼盖屋盖等水平构件采用钢筋混凝土材料或其他材料建造的房屋。', '多用于低层和多层民用建筑。'],
      ['结构与构造理论', '混凝土与砌体', '构造柱', 'Constructional Column', '在房屋外墙或纵横墙交接处先砌墙后浇筑混凝土、并与墙连成整体的钢筋混凝土柱。', '用于增强砌体结构的抗震性能。'],
      ['结构与构造理论', '混凝土与砌体', '圈梁', 'Ring Beam', '在墙体内沿水平方向同一标高设置的封闭的钢筋混凝土梁或钢筋砖带。', '增强房屋整体性，防止地基不均匀沉降破坏。'],
      ['结构与构造理论', '混凝土与砌体', '过梁', 'Lintel', '设置于门窗洞口或其他洞口的顶部，以承受洞口顶面以上的砌体自重及一定范围内的上层梁、板荷载。', '常见形式有砖拱过梁、钢筋砖过梁、钢筋混凝土过梁。'],
      ['结构与构造理论', '混凝土与砌体', '挑梁', 'Cantilever Beam', '一端出挑另一端嵌固于墙体内的钢筋混凝土梁。', '用于支撑阳台、雨篷等悬挑构件。'],
      ['结构与构造理论', '混凝土与砌体', '雨篷', 'Canopy', '由雨篷板和雨篷梁组成。', '设置在建筑物出入口上部的遮雨设施。'],
      ['结构与构造理论', '混凝土与砌体', '框架结构', 'Frame Structure', '由梁和柱刚性连接的骨架结构。', '优点是强度高，自重轻，整体性和抗震性好，建筑平面布置灵活，可以获得较大的使用空间。'],
      ['结构与构造理论', '钢结构', '钢结构', 'Steel Structure', '用热轧钢筋、钢板、钢管或冷加工的薄壁型钢等钢材通过焊接、螺栓连接或铆钉连接等方式建造的结构。', '具有强度高、自重轻、塑性韧性好等特点。'],
      ['结构与构造理论', '钢结构', '钢材性能指标', 'Steel Properties', '抗拉强度：衡量钢材抵抗拉断的性能指标；伸长率：衡量钢材塑性性能的指标；屈服强度：衡量结构承载能力和确定强度设计值的重要指标。', '是钢结构设计选材的依据。'],
      ['结构与构造理论', '钢结构', '整体失稳', 'Overall Instability', '指荷载尚未达到按强度计算的破坏荷载时，结构已不能继续承载并产生较大的变形，致使整体结构偏离原有位置而破坏。', '受压构件常见的破坏形式。'],
      ['结构与构造理论', '钢结构', '局部失稳', 'Local Instability', '指在保持整体稳定的条件下，结构中的局部构件或构件中的板件在尚未达到其强度时已不能继续承载而失去稳定。', '例如工字钢翼缘的波浪形屈曲。'],
      ['结构与构造理论', '钢结构', '焊接连接', 'Welded Connection', '采用电弧焊，通过电弧产生的热量使焊条和局部焊体熔化、经冷却后形成焊缝，使焊件连成一体。', '钢结构最常用的连接方式之一。'],
      ['结构与构造理论', '抗震与防灾设计', '强柱弱梁', 'Strong Column Weak Beam', '抗震设计的核心概念，指柱的抗弯能力应大于梁。', '目的是确保在强烈地震中，塑性铰首先出现在梁端而非柱端，防止建筑瞬间崩溃。'],
      ['结构与构造理论', '抗震与防灾设计', '伸缩缝', 'Expansion Joint', '为避免温度应力和砼收缩应力使房屋产生裂缝而设置的。', '在伸缩缝处，基础顶面以上的结构和建筑全部分开。'],
      ['结构与构造理论', '抗震与防灾设计', '沉降缝', 'Settlement Joint', '为避免地基不均匀沉降在房屋构件中产生裂缝而设置的。', '必要时须设置沉降缝将建筑物从屋顶到基础完全分开。'],
      ['结构与构造理论', '抗震与防灾设计', '恒载', 'Dead Load', '包括结构自重、结构表面的粉灰重、土压力等。', '荷载的标准值可按设计尺寸与材料自重标准值计算。'],
      ['结构与构造理论', '抗震与防灾设计', '地震基本概念', 'Basic Seismic Concepts', '震源：地下发生地震的部位；震中：震源在地面上的投影点；地震波：地震时震源发出的振动以弹性波的形式向各个方向传播；震级：衡量一次地震释放能量大小的尺度。', '震级每提高一级，释放能量增大32倍。'],
      ['结构与构造理论', '抗震与防灾设计', '地震烈度', 'Seismic Intensity', '地震发生时在某一地点地面及建筑物遭受地震影响的强烈程度。', '震中区的地震烈度最高，称为震中烈度。'],
      ['结构与构造理论', '抗震与防灾设计', '抗震设防', 'Seismic Fortification', '是指为达到抗震效果对建筑物进行抗震设计和所采取的抗震措施。', '包括地震作用计算和抗震构造措施。'],
      ['结构与构造理论', '抗震与防灾设计', '设防标准', 'Fortification Standard', '甲类建筑：应高于本地区抗震设防烈度；乙类建筑：地震作用符合本地区，措施提高一度；丙类建筑：均符合本地区要求；丁类建筑：措施可适当降低。', '根据建筑重要性分类。'],
      ['结构与构造理论', '抗震与防灾设计', '抗震设防目标', 'Seismic Fortification Objectives', '指对建筑结构所具有的抗震安全性的要求。', '通常概括为“三水准”设防目标。'],
      ['结构与构造理论', '抗震与防灾设计', '三水准设防', 'Three-level Fortification', '小震不坏：遭遇低于本地区设防烈度的多遇地震，一般不受损坏；中震可修：遭遇本地区设防烈度地震，可能损坏但经修理可继续使用；大震不倒：遭遇罕遇地震，不致倒塌或发生危及生命的严重破坏。', '抗震设计的核心指导思想。'],
      ['结构与构造理论', '抗震与防灾设计', '基础埋置深度', 'Foundation Embedment Depth', '基础底面至自然地面的距离。', '影响基础的稳定性和承载力。'],
      ['结构与构造理论', '抗震与防灾设计', '箱形基础', 'Box Foundation', '箱形基础由顶板、底板、外墙和内隔墙组成，是具有一定高度的整体结构。', '刚度大，整体性好，适用于高层建筑。']
    ];

    const entries: Entry[] = [];
    let idCounter = 0;
    const nextId = () => `arch_${++idCounter}`;

    const allData = [...rawData];

    allData.forEach((item, index) => {
      entries.push({
        id: nextId(),
        category: item[0],
        subcategory: item[1],
        term: item[2],
        termEn: item[3],
        definition: item[4],
        details: item[5],
        imageUrl: index < 24 ? `/images/arch_${index + 1}.webp` : undefined
      });
    });

    this.entries.set(entries);
  }
}
