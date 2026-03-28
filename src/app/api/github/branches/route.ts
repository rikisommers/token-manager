import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

// Create a new branch
export async function POST(request: NextRequest) {
  const authResult = await requireRole(Action.PushGithub);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const { repository, githubToken, branchName, sourceBranch = 'main' } = await request.json();

    if (!repository || !githubToken || !branchName) {
      return NextResponse.json(
        { error: 'Missing required fields: repository, githubToken, or branchName' },
        { status: 400 }
      );
    }

    // First, get the SHA of the source branch
    const refResponse = await fetch(`https://api.github.com/repos/${repository}/git/ref/heads/${sourceBranch}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!refResponse.ok) {
      const errorData = await refResponse.json();
      throw new Error(`Failed to get source branch: ${errorData.message}`);
    }

    const refData = await refResponse.json();
    const sourceSha = refData.object.sha;

    // Create the new branch
    const createResponse = await fetch(`https://api.github.com/repos/${repository}/git/refs`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: sourceSha,
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      if (createResponse.status === 422 && errorData.message?.includes('already exists')) {
        throw new Error(`Branch '${branchName}' already exists`);
      }
      throw new Error(errorData.message || 'Failed to create branch');
    }

    const branchData = await createResponse.json();

    return NextResponse.json({
      success: true,
      message: `Branch '${branchName}' created successfully`,
      branch: {
        name: branchName,
        ref: branchData.ref,
        sha: branchData.object.sha
      }
    });

  } catch (error) {
    console.error('Branch creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create branch' },
      { status: 500 }
    );
  }
}

// Get all branches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repository = searchParams.get('repository');
    const githubToken = searchParams.get('githubToken');

    if (!repository || !githubToken) {
      return NextResponse.json(
        { error: 'Missing required parameters: repository or githubToken' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://api.github.com/repos/${repository}/branches`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch branches');
    }

    const branches = await response.json();

    return NextResponse.json({
      success: true,
      branches: branches.map((branch: any) => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected || false
      }))
    });

  } catch (error) {
    console.error('Branch fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch branches' },
      { status: 500 }
    );
  }
}