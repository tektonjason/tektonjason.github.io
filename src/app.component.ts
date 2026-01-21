
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { DataService } from './services/data.service';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass, FormsModule],
  templateUrl: './app.component.html',
})
export class AppComponent {
  dataService = inject(DataService);
  // isSidebarOpen signal removed; using dataService.isSidebarOpen

  // Login Modal State
  showLoginModal = signal(false);
  loginEmail = signal('');
  loginPass = signal('');
  loginError = signal('');

  // Logout Modal State
  showLogoutModal = signal(false);

  toggleSidebar() {
    this.dataService.toggleSidebar();
  }

  handleAdminAction() {
    if (this.dataService.isAdmin()) {
      // Use custom modal instead of window.confirm
      this.showLogoutModal.set(true);
    } else {
      // Reset and open modal instead of using window.prompt
      this.loginEmail.set('');
      this.loginPass.set('');
      this.loginError.set('');
      this.showLoginModal.set(true);
    }
  }

  performLogin() {
    if (this.dataService.login(this.loginEmail(), this.loginPass())) {
      this.showLoginModal.set(false);
    } else {
      this.loginError.set('认证失败：账号或密码错误');
    }
  }

  confirmLogout() {
    this.dataService.logout();
    this.showLogoutModal.set(false);
  }

  closeLoginModal() {
    this.showLoginModal.set(false);
  }
}
