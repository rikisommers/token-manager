import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GitHubService } from '../services/github.service';

interface DirectoryItem {
  name: string;
  path: string;
  type: 'dir' | 'file';
  children?: DirectoryItem[];
}

@Component({
  selector: 'app-github-directory-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div *ngIf="loading" class="bg-white rounded-lg p-6 w-96">
        <div class="text-center">Loading directory tree...</div>
      </div>

      <div *ngIf="!loading" class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between p-4 border-b">
          <h3 class="text-lg font-medium">
            {{ mode === 'import' ? 'Select Directory or File to Import' : 'Choose Export Destination' }}
          </h3>
          <button
            (click)="cancel.emit()"
            class="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div class="flex-1 overflow-auto p-4">
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-medium text-gray-700">Repository Directory Structure:</div>
              <div *ngIf="availableBranches.length > 0" class="flex items-center gap-2">
                <label class="text-xs font-medium text-gray-700">Branch:</label>
                <select
                  [(ngModel)]="selectedBranch"
                  (ngModelChange)="onBranchChange()"
                  class="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option *ngFor="let branchName of availableBranches" [value]="branchName">
                    {{ branchName }}
                  </option>
                </select>
              </div>
            </div>
            <div class="border rounded-md p-3 bg-gray-50 max-h-64 overflow-auto">
              <div
                [ngClass]="{
                  'flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100': true,
                  'bg-blue-100': selectedPath === '' && selectionType === 'directory'
                }"
                (click)="selectRoot()"
              >
                <span class="mr-2">📁</span>
                <span class="text-sm font-medium">/ (root)</span>
                <span *ngIf="mode === 'import' && selectedPath === '' && selectionType === 'directory'"
                      class="ml-auto text-xs text-blue-600">Selected</span>
              </div>
              <ng-container *ngFor="let item of directoryTree">
                <ng-container *ngTemplateOutlet="treeNode; context: { item: item, level: 0 }"></ng-container>
              </ng-container>
            </div>
          </div>

          <div *ngIf="mode === 'import'" class="space-y-3">
            <div *ngIf="selectionType === 'file' && selectedFile">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Selected File:
              </label>
              <div class="px-3 py-2 bg-green-50 border border-green-200 rounded text-sm font-mono text-green-800">
                {{ selectedFile }}
              </div>
            </div>
            <div *ngIf="selectionType === 'directory'">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Selected Directory:
              </label>
              <div class="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm font-mono text-blue-800">
                /{{ selectedPath || '(root)' }}
              </div>
              <p class="text-xs text-blue-600 mt-1">
                Will import all JSON files from this directory
              </p>
            </div>
            <div class="text-sm text-gray-600">
              <span *ngIf="selectionType">✅ Selection ready for import</span>
              <span *ngIf="!selectionType">Click on a JSON file or directory above to select it for import</span>
            </div>
          </div>

          <div *ngIf="mode === 'export'" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Selected Directory:
              </label>
              <div class="px-3 py-2 bg-gray-50 border rounded text-sm font-mono">
                /{{ selectedPath || '(root)' }}
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Filename:
              </label>
              <input
                type="text"
                [(ngModel)]="filename"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tokens.json"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Full Path:
              </label>
              <div class="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm font-mono text-blue-800">
                {{ selectedPath ? selectedPath + '/' + filename : filename }}
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 border-t flex justify-end space-x-3">
          <button
            (click)="cancel.emit()"
            class="px-4 py-2 text-gray-600 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            (click)="handleSelect()"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {{ mode === 'import' ? 'Import' : 'Select Path' }}
          </button>
        </div>
      </div>
    </div>

    <ng-template #treeNode let-item="item" let-level="level">
      <div [style.marginLeft.px]="level * 20">
        <div *ngIf="item.type === 'dir'"
             [ngClass]="{
               'flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100': true,
               'bg-blue-100': selectedPath === item.path && selectionType === 'directory'
             }"
             (click)="handleDirectoryClick(item)">
          <span class="mr-2 text-gray-500">
            {{ isExpanded(item.path) ? '📂' : '📁' }}
          </span>
          <span class="text-sm">{{ item.name }}</span>
          <span *ngIf="mode === 'import' && selectedPath === item.path && selectionType === 'directory'"
                class="ml-auto text-xs text-blue-600">Selected</span>
        </div>

        <div *ngIf="item.type === 'file'"
             [ngClass]="{
               'flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100': true,
               'bg-green-100': selectedFile === item.path,
               'text-gray-600': selectedFile !== item.path
             }"
             (click)="handleFileClick(item)">
          <span class="mr-2">📄</span>
          <span class="text-sm">{{ item.name }}</span>
          <span *ngIf="mode === 'import' && selectedFile === item.path"
                class="ml-auto text-xs text-green-600">Selected</span>
        </div>

        <div *ngIf="item.children && isExpanded(item.path)">
          <ng-container *ngFor="let child of item.children">
            <ng-container *ngTemplateOutlet="treeNode; context: { item: child, level: level + 1 }"></ng-container>
          </ng-container>
        </div>
      </div>
    </ng-template>
  `
})
export class GitHubDirectoryPickerComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() githubToken = '';
  @Input() repository = '';
  @Input() branch = '';
  @Input() mode: 'export' | 'import' = 'export';
  @Input() defaultFilename = 'tokens.json';
  @Input() availableBranches: string[] = [];

  @Output() select = new EventEmitter<{ path: string; branch: string }>();
  @Output() cancel = new EventEmitter<void>();

  directoryTree: DirectoryItem[] = [];
  expandedDirs = new Set<string>();
  selectedPath = '';
  selectedFile = '';
  filename = 'tokens.json';
  loading = true;
  selectedBranch = '';
  selectionType: 'file' | 'directory' | '' = '';

  constructor(private githubService: GitHubService) {}

  ngOnInit() {
    this.filename = this.defaultFilename;
    this.selectedBranch = this.branch;
    if (this.isOpen) {
      this.loadInitialData();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen && !changes['isOpen'].firstChange) {
      this.resetState();
      this.loadInitialData();
    }
    if (changes['branch'] && !changes['branch'].firstChange) {
      this.selectedBranch = this.branch;
    }
  }

  private resetState() {
    this.directoryTree = [];
    this.expandedDirs = new Set();
    this.selectedPath = '';
    this.selectedFile = '';
    this.selectionType = '';
    this.loading = true;
  }

  private async loadInitialData() {
    this.loading = true;
    await this.loadDirectoryContents('');
    this.loading = false;
  }

  async onBranchChange() {
    this.resetState();
    await this.loadInitialData();
  }

  private async loadDirectoryContents(path: string = '') {
    try {
      const contents = await this.githubService.listDirectory(
        this.githubToken,
        this.repository,
        path,
        this.selectedBranch
      );

      const items: DirectoryItem[] = contents
        .filter(item => item.type === 'dir' || item.name.endsWith('.json'))
        .map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          children: item.type === 'dir' ? [] : undefined
        }));

      if (path === '') {
        this.directoryTree = items;
      } else {
        this.directoryTree = this.updateTreeWithContents(this.directoryTree, path, items);
      }
    } catch (error) {
      console.error('Error loading directory:', error);
      alert('Failed to load directory contents');
    }
  }

  private updateTreeWithContents(tree: DirectoryItem[], targetPath: string, newItems: DirectoryItem[]): DirectoryItem[] {
    return tree.map(item => {
      if (item.path === targetPath && item.type === 'dir') {
        return { ...item, children: newItems };
      } else if (item.children && item.path !== targetPath) {
        return { ...item, children: this.updateTreeWithContents(item.children, targetPath, newItems) };
      }
      return item;
    });
  }

  isExpanded(path: string): boolean {
    return this.expandedDirs.has(path);
  }

  async handleDirectoryClick(item: DirectoryItem) {
    if (this.mode === 'import') {
      this.selectedPath = item.path;
      this.selectedFile = '';
      this.selectionType = 'directory';
    } else {
      this.selectedPath = item.path;
    }
    await this.toggleDirectory(item);
  }

  handleFileClick(item: DirectoryItem) {
    if (this.mode === 'import') {
      this.selectedFile = item.path;
      this.selectedPath = '';
      this.selectionType = 'file';
    }
  }

  selectRoot() {
    if (this.mode === 'import') {
      this.selectedPath = '';
      this.selectedFile = '';
      this.selectionType = 'directory';
    } else {
      this.selectedPath = '';
    }
  }

  private async toggleDirectory(item: DirectoryItem) {
    if (item.type !== 'dir') return;

    if (this.expandedDirs.has(item.path)) {
      this.expandedDirs.delete(item.path);
    } else {
      this.expandedDirs.add(item.path);
      // Load contents if not already loaded
      if (!item.children || item.children.length === 0) {
        await this.loadDirectoryContents(item.path);
      }
    }
  }

  handleSelect() {
    if (this.mode === 'import') {
      // For import, we can select either a file or directory
      if (this.selectionType === 'file' && this.selectedFile) {
        this.select.emit({ path: this.selectedFile, branch: this.selectedBranch });
      } else if (this.selectionType === 'directory') {
        this.select.emit({ path: this.selectedPath, branch: this.selectedBranch });
      } else {
        alert('Please select a JSON file or directory containing tokens');
        return;
      }
    } else {
      // For export, we need a filename
      if (!this.filename.trim()) {
        alert('Please enter a filename');
        return;
      }

      if (!this.filename.endsWith('.json')) {
        alert('Filename must end with .json');
        return;
      }

      const fullPath = this.selectedPath ? `${this.selectedPath}/${this.filename}` : this.filename;
      this.select.emit({ path: fullPath, branch: this.selectedBranch });
    }
  }
}
