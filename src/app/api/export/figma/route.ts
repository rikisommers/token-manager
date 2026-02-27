import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { tokenSet, figmaToken, fileKey, collectionId, mongoCollectionId } = await request.json();

    if (!tokenSet || !figmaToken || !fileKey) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenSet, figmaToken, or fileKey' },
        { status: 400 }
      );
    }

    // Transform tokens to Figma format
    const figmaVariables = transformToFigmaVariables(tokenSet, collectionId);

    // Figma Variables API endpoint
    const apiUrl = `https://api.figma.com/v1/files/${fileKey}/variables/local`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-Figma-Token': figmaToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variables: figmaVariables
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to export to Figma');
    }

    const responseData = await response.json();

    // Update MongoDB collection's sourceMetadata to record Figma as upstream
    if (mongoCollectionId) {
      try {
        const { default: dbConnect } = await import('@/lib/mongodb');
        const { default: TokenCollection } = await import('@/lib/db/models/TokenCollection');
        await dbConnect();
        await TokenCollection.findByIdAndUpdate(mongoCollectionId, {
          $set: {
            'sourceMetadata.type': 'figma',
            'sourceMetadata.figmaFileKey': fileKey,
            'sourceMetadata.figmaCollectionId': collectionId || null,
          },
        });
      } catch (e) {
        // Non-fatal: log but don't fail the export response
        console.error('Failed to update sourceMetadata after Figma export:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tokens successfully exported to Figma',
      data: responseData
    });

  } catch (error) {
    console.error('Figma export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export to Figma' },
      { status: 500 }
    );
  }
}

function transformToFigmaVariables(tokenSet: any, collectionId?: string): any[] {
  const variables: any[] = [];

  function processTokens(obj: any, path: string = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}/${key}` : key;

      if (value && typeof value === 'object' && '$value' in value) {
        // This is a token
        const token = value as any;

        const variable = {
          name: currentPath,
          variableCollectionId: collectionId || 'default',
          resolvedType: mapTokenTypeToFigmaType(token.$type),
          valuesByMode: {
            default: mapTokenValueToFigmaValue(token.$value, token.$type)
          },
          ...(token.$description && { description: token.$description })
        };

        variables.push(variable);
      } else if (value && typeof value === 'object') {
        // Nested group, recurse
        processTokens(value, currentPath);
      }
    }
  }

  processTokens(tokenSet);
  return variables;
}

function mapTokenTypeToFigmaType(tokenType: string): string {
  const typeMap: Record<string, string> = {
    'color': 'COLOR',
    'dimension': 'FLOAT',
    'fontFamily': 'STRING',
    'fontWeight': 'FLOAT',
    'duration': 'FLOAT',
    'number': 'FLOAT',
    'boolean': 'BOOLEAN'
  };

  return typeMap[tokenType] || 'STRING';
}

function mapTokenValueToFigmaValue(value: any, type: string): any {
  switch (type) {
    case 'color':
      if (typeof value === 'string') {
        // Convert hex to RGB
        const hex = value.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        return { r, g, b, a: 1 };
      }
      return value;

    case 'dimension':
      if (typeof value === 'string') {
        // Extract numeric value from strings like "16px"
        const numericValue = parseFloat(value);
        return isNaN(numericValue) ? 0 : numericValue;
      }
      return value;

    default:
      return value;
  }
}
