import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GitHubService } from '../services/github.service';
import { GitHubConfig, TokenGroup, ToastMessage, LoadingState } from '../types';
import { createLoadingState, createToast } from '../utils';

@Component({
  selector: 'app-token-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto p-6 max-w-6xl">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Design Token Manager - Angular</h1>

      <!-- GitHub Configuration -->
      <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
        <h2 class="text-xl font-semibold mb-4">GitHub Configuration</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">GitHub Token</label>
            <input
              type="password"
              [(ngModel)]="githubConfig.token"
              placeholder="ghp_..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Repository</label>
            <input
              type="text"
              [(ngModel)]="githubConfig.repository"
              placeholder="owner/repo"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Branch</label>
            <input
              type="text"
              [(ngModel)]="githubConfig.branch"
              placeholder="main"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div class="mt-4">
          <button
            (click)="testConnection()"
            [disabled]="loadingState.isLoading"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Test Connection
          </button>
        </div>
      </div>

      <!-- Token Groups -->
      <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
        <h2 class="text-xl font-semibold mb-4">Token Groups</h2>
        <div *ngIf="tokenGroups.length === 0" class="text-gray-500 text-center py-8">
          No token groups yet. Import from GitHub or create manually.
        </div>
        <div *ngFor="let group of tokenGroups" class="border border-gray-200 rounded-lg mb-4 p-4">
          <h3 class="font-medium text-gray-900">{{ group.name }}</h3>
          <p class="text-sm text-gray-600">{{ group.tokens.length }} tokens</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 class="text-xl font-semibold mb-4">Actions</h2>
        <div class="flex space-x-4">
          <button
            (click)="importFromGitHub()"
            [disabled]="loadingState.isLoading || !isConfigValid"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Import from GitHub
          </button>
          <button
            (click)="exportToJson()"
            [disabled]="loadingState.isLoading"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Export to JSON
          </button>
        </div>
      </div>

      <!-- Loading Indicator -->
      <div *ngIf="loadingState.isLoading"
           class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-lg shadow-xl">
          <div class="flex items-center space-x-3">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <div>
              <h3 class="text-lg font-medium text-gray-900">Loading...</h3>
              <p *ngIf="loadingState.message" class="text-sm text-gray-600">{{ loadingState.message }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Toast Notification -->
      <div *ngIf="toast" class="fixed top-4 right-4 z-50">
        <div [ngClass]="{
          'border-l-4 border-green-400': toast.type === 'success',
          'border-l-4 border-red-400': toast.type === 'error',
          'border-l-4 border-blue-400': toast.type === 'info'
        }" class="max-w-sm w-full bg-white shadow-lg rounded-lg ring-1 ring-black ring-opacity-5">
          <div class="p-4">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <span *ngIf="toast.type === 'success'" class="text-green-400 text-lg">✓</span>
                <span *ngIf="toast.type === 'error'" class="text-red-400 text-lg">✕</span>
                <span *ngIf="toast.type === 'info'" class="text-blue-400 text-lg">ℹ</span>
              </div>
              <div class="ml-3 w-0 flex-1">
                <p class="text-sm font-medium text-gray-900">{{ toast.message }}</p>
              </div>
              <div class="ml-4 flex-shrink-0">
                <button (click)="hideToast()"
                        class="text-gray-400 hover:text-gray-600">
                  <span class="text-sm">✕</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class TokenGeneratorComponent implements OnInit {
  private githubService = inject(GitHubService);

  githubConfig: GitHubConfig = {
    token: '',
    repository: '',
    branch: 'main'
  };

  tokenGroups: TokenGroup[] = [];
  loadingState: LoadingState = createLoadingState(false);
  toast: ToastMessage | null = null;
  isConfigValid = false;

  ngOnInit() {
    console.log('Token Generator Component initialized with clean architecture!');
  }

  async testConnection() {
    if (!this.githubConfig.token || !this.githubConfig.repository) {
      this.showToast(createToast('Please fill in GitHub token and repository', 'error'));
      return;
    }

    this.setLoading(true, 'Testing GitHub connection...');

    try {
      const result = await this.githubService.validateConfig(this.githubConfig);

      if (result.valid) {
        this.isConfigValid = true;
        this.showToast(createToast('GitHub connection successful!', 'success'));
      } else {
        this.isConfigValid = false;
        this.showToast(createToast(result.error || 'Connection failed', 'error'));
      }
    } catch (error) {
      this.isConfigValid = false;
      this.showToast(createToast('Connection test failed', 'error'));
    } finally {
      this.setLoading(false);
    }
  }

  async importFromGitHub() {
    this.setLoading(true, 'Importing tokens from GitHub...');

    try {
      // This is a simplified version - in the full implementation,
      // we would show a directory picker and use the TokenService
      this.showToast(createToast('Import functionality ready for implementation', 'info'));
    } catch (error) {
      this.showToast(createToast('Import failed', 'error'));
    } finally {
      this.setLoading(false);
    }
  }

  exportToJson() {
    // This would use the FileService to export tokens
    this.showToast(createToast('Export functionality ready for implementation', 'info'));
  }

  private setLoading(isLoading: boolean, message?: string) {
    this.loadingState = createLoadingState(isLoading, message);
  }

  private showToast(toast: ToastMessage) {
    this.toast = toast;
    // Auto-hide after 5 seconds
    setTimeout(() => this.hideToast(), 5000);
  }

  hideToast() {
    this.toast = null;
  }
}