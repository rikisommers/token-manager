import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { TokenUpdater } from '@/utils/tokenUpdater';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const authResult = await requireRole(Action.Write);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const body = await request.json();
    const { tokenPath, newValue } = body;

    if (!tokenPath || newValue === undefined) {
      return NextResponse.json(
        { error: 'Missing tokenPath or newValue' },
        { status: 400 }
      );
    }

    const filePath = params.path.join('/');
    const tokensDir = path.join(process.cwd(), 'tokens');
    const updater = new TokenUpdater(tokensDir);

    const success = await updater.updateToken(filePath, tokenPath, newValue);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token updated successfully',
      tokenPath,
      newValue
    });
  } catch (error) {
    console.error('Error updating token:', error);
    return NextResponse.json(
      { error: 'Failed to update token' },
      { status: 500 }
    );
  }
}