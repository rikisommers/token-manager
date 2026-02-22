import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  GitHubConfig,
  GitHubFileResponse,
  GitHubBranch,
  TokenGroup,
  ToastMessage
} from '../types';

@Injectable({
  providedIn: 'root'
})
export class GitHubService {
  private readonly BASE_URL = 'https://api.github.com';

  constructor(private http: HttpClient) {}

  /**
   * Get all branches for a repository
   */
  async getBranches(token: string, repository: string): Promise<GitHubBranch[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/repos/${repository}/branches`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Token-Manager/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const branches = await response.json();
      return branches.map((branch: any) => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected || false
      }));
    } catch (error) {
      console.error('Error fetching branches:', error);
      throw new Error(`Failed to fetch branches: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(
    token: string,
    repository: string,
    path: string,
    branch: string = 'main'
  ): Promise<GitHubFileResponse> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/repos/${repository}/contents/${path}?ref=${branch}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Token-Manager/1.0'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`File not found: ${path}`);
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const fileData = await response.json();

      if (fileData.type !== 'file') {
        throw new Error(`Path ${path} is not a file`);
      }

      return {
        content: atob(fileData.content),
        sha: fileData.sha,
        path: fileData.path,
        size: fileData.size
      };
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw new Error(`Failed to fetch file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create or update file in repository
   */
  async createOrUpdateFile(
    token: string,
    repository: string,
    path: string,
    content: string,
    message: string,
    branch: string = 'main',
    existingSha?: string
  ): Promise<void> {
    try {
      const body: any = {
        message,
        content: btoa(content),
        branch
      };

      if (existingSha) {
        body.sha = existingSha;
      }

      const response = await fetch(
        `${this.BASE_URL}/repos/${repository}/contents/${path}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Token-Manager/1.0',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `GitHub API error: ${response.status} ${response.statusText}${
            errorData.message ? ` - ${errorData.message}` : ''
          }`
        );
      }
    } catch (error) {
      console.error('Error creating/updating file:', error);
      throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(
    token: string,
    repository: string,
    path: string = '',
    branch: string = 'main'
  ): Promise<Array<{ name: string; path: string; type: 'file' | 'dir' }>> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/repos/${repository}/contents/${path}?ref=${branch}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Token-Manager/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const contents = await response.json();

      if (!Array.isArray(contents)) {
        throw new Error(`Path ${path} is not a directory`);
      }

      return contents.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type === 'dir' ? 'dir' : 'file'
      }));
    } catch (error) {
      console.error('Error listing directory:', error);
      throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import tokens from GitHub directory
   */
  async importTokensFromDirectory(
    token: string,
    repository: string,
    directoryPath: string,
    branch: string = 'main'
  ): Promise<{ tokenGroups: TokenGroup[]; toast: ToastMessage }> {
    try {
      // List all files in the directory
      const contents = await this.listDirectory(token, repository, directoryPath, branch);
      const jsonFiles = contents.filter(item =>
        item.type === 'file' && item.name.endsWith('.json')
      );

      if (jsonFiles.length === 0) {
        throw new Error('No JSON token files found in the selected directory');
      }

      const allTokens: any = {};
      let filesProcessed = 0;

      for (const file of jsonFiles) {
        try {
          const fileContent = await this.getFileContent(token, repository, file.path, branch);
          const tokenData = JSON.parse(fileContent.content);

          // Merge tokens from this file
          Object.assign(allTokens, tokenData);
          filesProcessed++;
        } catch (fileError) {
          console.warn(`Failed to process file ${file.name}:`, fileError);
          // Continue processing other files
        }
      }

      if (filesProcessed === 0) {
        throw new Error('Failed to process any token files from the directory');
      }

      // Convert to TokenGroups (this would need the TokenService)
      // For now, return a simple structure
      const tokenGroups: TokenGroup[] = [
        {
          id: 'imported-1',
          name: 'Imported Tokens',
          tokens: [],
          level: 0,
          expanded: true
        }
      ];

      return {
        tokenGroups,
        toast: {
          type: 'success',
          message: `Successfully imported tokens from ${filesProcessed} file(s)`
        }
      };

    } catch (error) {
      console.error('Error importing tokens from GitHub:', error);
      return {
        tokenGroups: [],
        toast: {
          type: 'error',
          message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }

  /**
   * Validate GitHub configuration
   */
  async validateConfig(config: GitHubConfig): Promise<{ valid: boolean; error?: string }> {
    try {
      // Test API access by fetching repository info
      const response = await fetch(`${this.BASE_URL}/repos/${config.repository}`, {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Token-Manager/1.0'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { valid: false, error: 'Invalid GitHub token' };
        } else if (response.status === 404) {
          return { valid: false, error: 'Repository not found or no access' };
        } else {
          return { valid: false, error: `GitHub API error: ${response.status}` };
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}