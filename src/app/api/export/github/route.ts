import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

export async function POST(request: NextRequest) {
  const authResult = await requireRole(Action.PushGithub);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const { tokenSet, repository, branch = 'main', path = 'tokens.json', githubToken } = await request.json();

    if (!tokenSet || !repository || !githubToken || !path) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenSet, repository, githubToken, or path' },
        { status: 400 }
      );
    }

    // Validate path
    if (!path.endsWith('.json')) {
      return NextResponse.json(
        { error: 'File path must end with .json extension' },
        { status: 400 }
      );
    }

    // GitHub API endpoint
    const apiUrl = `https://api.github.com/repos/${repository}/contents/${path}`;

    // First, try to get the current file to get the SHA for overwriting
    let sha: string | undefined;
    let isNewFile = true;
    try {
      const currentFileResponse = await fetch(`${apiUrl}?ref=${branch}`, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (currentFileResponse.ok) {
        const currentFile = await currentFileResponse.json();
        sha = currentFile.sha;
        isNewFile = false;
        console.log(`File ${path} exists, will overwrite`);
      }
    } catch (error) {
      // File doesn't exist, which is fine for new files
      console.log(`File ${path} does not exist, will create new file`);
    }

    // Prepare the content
    const content = Buffer.from(JSON.stringify(tokenSet, null, 2)).toString('base64');

    // Create or update the file
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: isNewFile
          ? `Create design tokens file: ${path} - ${new Date().toISOString()}`
          : `Update design tokens file: ${path} - ${new Date().toISOString()}`,
        content,
        branch,
        ...(sha && { sha })
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to push to GitHub');
    }

    const responseData = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Tokens successfully pushed to GitHub',
      url: responseData.content.html_url
    });

  } catch (error) {
    console.error('GitHub export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export to GitHub' },
      { status: 500 }
    );
  }
}