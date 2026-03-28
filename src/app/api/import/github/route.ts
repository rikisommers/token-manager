import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

// Recursive function to process directories and subdirectories
async function processDirectory(
  items: any[],
  currentPath: string,
  repository: string,
  branch: string,
  githubToken: string,
  combinedTokenSet: any,
  metadata: any[]
) {
  for (const item of items) {
    if (item.type === 'file' && item.name.endsWith('.json')) {
      // Process JSON file
      try {
        const fileResponse = await fetch(item.url, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
          const tokens = JSON.parse(content);

          // Create nested structure based on path
          const pathParts = item.path.split('/');
          const fileName = pathParts.pop()?.replace('.json', '') || 'unknown';

          // Create hierarchical structure: directory/subdirectory/filename
          let current = combinedTokenSet;
          for (const part of pathParts.slice(currentPath ? currentPath.split('/').length : 0)) {
            if (!current[part]) {
              current[part] = {};
            }
            current = current[part];
          }

          current[fileName] = tokens;

          metadata.push({
            file: item.name,
            path: item.path,
            sha: fileData.sha,
            url: item.html_url
          });
        }
      } catch (fileError) {
        console.warn(`Failed to import ${item.path}:`, fileError);
      }
    } else if (item.type === 'dir') {
      // Process subdirectory recursively
      try {
        const subdirResponse = await fetch(item.url, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        if (subdirResponse.ok) {
          const subdirData = await subdirResponse.json();
          await processDirectory(subdirData, currentPath, repository, branch, githubToken, combinedTokenSet, metadata);
        }
      } catch (dirError) {
        console.warn(`Failed to process directory ${item.path}:`, dirError);
      }
    }
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(Action.PushGithub);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const { repository, branch = 'main', path = 'tokens.json', githubToken } = await request.json();

    if (!repository || !githubToken) {
      return NextResponse.json(
        { error: 'Missing required fields: repository or githubToken' },
        { status: 400 }
      );
    }

    // GitHub API endpoint for getting contents
    const apiUrl = `https://api.github.com/repos/${repository}/contents/${path}?ref=${branch}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Path '${path}' not found in repository '${repository}' on branch '${branch}'`);
      }
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch from GitHub');
    }

    const data = await response.json();

    // Check if it's a file or directory
    if (Array.isArray(data)) {
      // It's a directory, recursively import all JSON files
      const combinedTokenSet: any = {};
      const metadata: any[] = [];

      await processDirectory(data, path, repository, branch, githubToken, combinedTokenSet, metadata);

      if (metadata.length === 0) {
        throw new Error(`No JSON files found in directory '${path}' or its subdirectories`);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${metadata.length} token files from directory and subdirectories`,
        tokenSet: combinedTokenSet,
        metadata: {
          type: 'directory',
          path,
          files: metadata
        }
      });

    } else {
      // It's a single file
      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      let tokenSet;
      try {
        tokenSet = JSON.parse(content);
      } catch (parseError) {
        throw new Error('Invalid JSON in token file');
      }

      return NextResponse.json({
        success: true,
        message: 'Tokens successfully imported from GitHub',
        tokenSet,
        metadata: {
          type: 'file',
          sha: data.sha,
          lastModified: data.commit?.author?.date,
          url: data.html_url
        }
      });
    }

  } catch (error) {
    console.error('GitHub import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import from GitHub' },
      { status: 500 }
    );
  }
}

// GET endpoint for listing available token files
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repository = searchParams.get('repository');
    const branch = searchParams.get('branch') || 'main';
    const githubToken = searchParams.get('githubToken');

    if (!repository || !githubToken) {
      return NextResponse.json(
        { error: 'Missing required parameters: repository or githubToken' },
        { status: 400 }
      );
    }

    // Get repository contents
    const apiUrl = `https://api.github.com/repos/${repository}/contents?ref=${branch}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch repository contents');
    }

    const contents = await response.json();

    // Filter for JSON files that might be token files
    const tokenFiles = contents
      .filter((file: any) => file.type === 'file' && file.name.endsWith('.json'))
      .map((file: any) => ({
        name: file.name,
        path: file.path,
        size: file.size,
        lastModified: file.git_url // We'd need another API call to get actual commit date
      }));

    return NextResponse.json({
      success: true,
      files: tokenFiles
    });

  } catch (error) {
    console.error('GitHub list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list files' },
      { status: 500 }
    );
  }
}