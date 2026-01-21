
import { Routes } from '@angular/router';
import { EncyclopediaComponent } from './components/encyclopedia/encyclopedia.component';
import { EntryDetailComponent } from './components/encyclopedia/entry-detail.component';
import { AiAssistantComponent } from './components/ai-assistant/ai-assistant.component';
import { ResourcesComponent } from './components/resources/resources.component';
import { UserDashboardComponent } from './components/user/user-dashboard.component';
import { ContactComponent } from './components/contact/contact.component';

export const routes: Routes = [
  { path: '', redirectTo: 'encyclopedia', pathMatch: 'full' },
  { path: 'encyclopedia', component: EncyclopediaComponent },
  { path: 'entry/:id', component: EntryDetailComponent },
  { path: 'ai', component: AiAssistantComponent },
  { path: 'resources', component: ResourcesComponent },
  { path: 'user', component: UserDashboardComponent }, // Handles History & Favorites
  { path: 'contact', component: ContactComponent },
];
