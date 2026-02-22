import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GitHubService, TokenService, FileService, FigmaService } from '../services';
import { GitHubConfig, TokenGroup, ToastMessage, LoadingState } from '../types';
import { createLoadingState, createToast } from '../utils';
import { LoadingIndicatorComponent } from './loading-indicator.component';
import { ToastNotificationComponent } from './toast-notification.component';
import { JsonPreviewDialogComponent } from './json-preview-dialog.component';
import { TokenTableComponent } from './token-table.component';
import { GitHubDirectoryPickerComponent } from './github-directory-picker.component';

@Component({
  selector: 'app-token-generator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingIndicatorComponent,
    ToastNotificationComponent,
    JsonPreviewDialogComponent,
    TokenTableComponent,
    GitHubDirectoryPickerComponent
  ],
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
        <div class="mt-4 flex gap-2">
          <button
            (click)="testConnection()"
            [disabled]="loadingState.isLoading"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Test Connection
          </button>
          <button
            (click)="importFromGitHub()"
            [disabled]="loadingState.isLoading || !isConfigValid"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Import from GitHub
          </button>
        </div>
      </div>

      <!-- File Import -->
      <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
        <h2 class="text-xl font-semibold mb-4">Import from File</h2>
        <div class="flex items-center gap-4">
          <input
            #fileInput
            type="file"
            accept=".json"
            (change)="onFileSelected($event)"
            class="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>
      </div>

      <!-- Token Table -->
      <div *ngIf="tokenGroups.length > 0" class="mb-6">
        <app-token-table [tokenGroups]="tokenGroups"></app-token-table>
      </div>

      <!-- Export Actions -->
      <div *ngIf="tokenGroups.length > 0" class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
        <h2 class="text-xl font-semibold mb-4">Export Tokens</h2>
        <div class="flex flex-wrap gap-2">
          <button
            (click)="exportTokens('json')"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Export as JSON
          </button>
          <button
            (click)="exportTokens('css')"
            class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Export as CSS
          </button>
          <button
            (click)="exportTokens('scss')"
            class="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            Export as SCSS
          </button>
          <button
            (click)="showPreview()"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Preview JSON
          </button>
        </div>
      </div>

      <!-- Global Namespace -->
      <div *ngIf="tokenGroups.length > 0" class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
        <h2 class="text-xl font-semibold mb-4">Global Namespace</h2>
        <input
          type="text"
          [(ngModel)]="globalNamespace"
          placeholder="token"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p class="mt-2 text-sm text-gray-600">
          Global namespace for token paths (e.g., "token", "design", "ds")
        </p>
      </div>

      <!-- Components -->
      <app-loading-indicator [loadingState]="loadingState"></app-loading-indicator>
      <app-toast-notification [toast]="toast" (close)="hideToast()"></app-toast-notification>
      <app-json-preview-dialog
        [isOpen]="showJsonPreview"
        [jsonData]="previewJsonData"
        [title]="'Token Preview'"
        (close)="closePreview()"
      ></app-json-preview-dialog>
      <app-github-directory-picker
        [isOpen]="showDirectoryPicker"
        [githubToken]="githubConfig.token"
        [repository]="githubConfig.repository"
        [branch]="githubConfig.branch"
        [mode]="directoryPickerMode"
        [availableBranches]="availableBranches"
        (select)="onDirectorySelected($event)"
        (cancel)="closeDirectoryPicker()"
      ></app-github-directory-picker>
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
  private tokenService = inject(TokenService);
  private fileService = inject(FileService);

  githubConfig: GitHubConfig = {
    token: '',
    repository: '',
    branch: 'main'
  };

  tokenGroups: TokenGroup[] = [];
  globalNamespace = 'token';
  loadingState: LoadingState = createLoadingState(false);
  toast: ToastMessage | null = null;
  isConfigValid = false;
  showJsonPreview = false;
  previewJsonData: any = {};
  showDirectoryPicker = false;
  directoryPickerMode: 'export' | 'import' = 'import';
  availableBranches: string[] = [];

  ngOnInit() {
    console.log('Token Generator Component initialized with full features!');
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
    if (!this.isConfigValid) {
      this.showToast(createToast('Please test connection first', 'error'));
      return;
    }

    // Load available branches
    try {
      this.setLoading(true, 'Loading branches...');
      const branches = await this.githubService.getBranches(
        this.githubConfig.token,
        this.githubConfig.repository
      );
      this.availableBranches = branches.map(b => b.name);
      this.setLoading(false);
    } catch (error) {
      console.error('Failed to load branches:', error);
      this.availableBranches = [this.githubConfig.branch];
      this.setLoading(false);
    }

    // Show directory picker
    this.directoryPickerMode = 'import';
    this.showDirectoryPicker = true;
  }

  async onDirectorySelected(event: { path: string; branch: string }) {
    this.showDirectoryPicker = false;
    this.setLoading(true, 'Importing tokens from GitHub...');

    try {
      // Check if it's a file or directory
      const isFile = event.path.endsWith('.json');

      if (isFile) {
        // Import single file
        const fileContent = await this.githubService.getFileContent(
          this.githubConfig.token,
          this.githubConfig.repository,
          event.path,
          event.branch
        );

        if (fileContent.content) {
          const tokenData = JSON.parse(fileContent.content);
          const processed = this.tokenService.processImportedTokens(
            tokenData,
            this.globalNamespace
          );

          this.tokenGroups = processed.groups;
          this.globalNamespace = processed.detectedGlobalNamespace;

          this.showToast(createToast(`Successfully imported tokens from ${event.path}`, 'success'));
        }
      } else {
        // Import directory
        const result = await this.githubService.importTokensFromDirectory(
          this.githubConfig.token,
          this.githubConfig.repository,
          event.path || '',
          event.branch
        );

        // Process the imported tokens properly
        if (result.tokenGroups.length > 0) {
          this.tokenGroups = result.tokenGroups;
          this.showToast(result.toast);
        } else {
          this.showToast(createToast('No tokens found in the selected directory', 'error'));
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      this.showToast(createToast(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error'));
    } finally {
      this.setLoading(false);
    }
  }

  closeDirectoryPicker() {
    this.showDirectoryPicker = false;
  }

  async onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.setLoading(true, 'Importing tokens from file...');

    try {
      const result = await this.fileService.importFromFile(file);

      if (result.success && result.tokens) {
        const processed = this.tokenService.processImportedTokens(
          result.tokens,
          this.globalNamespace
        );

        this.tokenGroups = processed.groups;
        this.globalNamespace = processed.detectedGlobalNamespace;

        this.showToast(createToast(`Successfully imported tokens from ${result.fileName}`, 'success'));
      } else {
        this.showToast(createToast(result.error || 'Import failed', 'error'));
      }
    } catch (error) {
      this.showToast(createToast('Failed to import file', 'error'));
    } finally {
      this.setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  }

  exportTokens(format: string) {
    try {
      const validFormats = ['json', 'js', 'ts', 'css', 'scss', 'less'];
      const exportFormat = (validFormats.includes(format) ? format : 'json') as 'json' | 'js' | 'ts' | 'css' | 'scss' | 'less';
      const fileName = `tokens${this.fileService.getFileExtension(exportFormat)}`;

      const content = this.fileService.exportTokens(
        this.tokenGroups,
        this.globalNamespace,
        { format: exportFormat, fileName, includeMetadata: true }
      );

      const mimeType = this.fileService.getMimeType(exportFormat);

      this.fileService.downloadFile(content, fileName, mimeType);

      this.showToast(createToast(`Tokens exported as ${exportFormat.toUpperCase()}`, 'success'));
    } catch (error) {
      this.showToast(createToast('Export failed', 'error'));
    }
  }

  showPreview() {
    this.previewJsonData = this.tokenService.generateStyleDictionaryOutput(
      this.tokenGroups,
      this.globalNamespace
    );
    this.showJsonPreview = true;
  }

  closePreview() {
    this.showJsonPreview = false;
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