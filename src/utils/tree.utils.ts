/**
 * tree.utils.ts
 * Utilities for parsing token group path names into display labels
 * and building the tree structure for the sidebar.
 */

/**
 * Converts a raw path segment into a human-readable display label.
 *
 * Rules:
 * - Hyphens and underscores are replaced with spaces
 * - The first letter of each space-separated word is capitalised
 * - Digit-joined words are NOT split: "brand1" → "Brand1"
 * - Numeric-only segments are returned as-is: "400" → "400"
 *
 * @example
 * buildDisplayLabel('border-color') // → 'Border Color'
 * buildDisplayLabel('border_radius') // → 'Border Radius'
 * buildDisplayLabel('brand1')        // → 'Brand1'
 * buildDisplayLabel('400')           // → '400'
 */
export function buildDisplayLabel(segment: string): string {
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Parses a token group path name into an array of display labels,
 * one per path segment.
 *
 * Rules:
 * - Splits the path by "/"
 * - Strips the ".json" extension from the LAST segment only
 * - Applies buildDisplayLabel to every segment
 *
 * @example
 * parseGroupPath('brands/brand1/color.json') // → ['Brands', 'Brand1', 'Color']
 * parseGroupPath('brands/brand2/color.json') // → ['Brands', 'Brand2', 'Color']
 * parseGroupPath('globals/border-color.json') // → ['Globals', 'Border Color']
 * parseGroupPath('globals/border-radius.json') // → ['Globals', 'Border Radius']
 * parseGroupPath('globals/breakpoint.json')   // → ['Globals', 'Breakpoint']
 */
export function parseGroupPath(groupName: string): string[] {
  const segments = groupName.split('/');
  return segments.map((segment, index) => {
    // Strip .json extension from the last segment only
    const cleaned =
      index === segments.length - 1
        ? segment.replace(/\.json$/i, '')
        : segment;
    return buildDisplayLabel(cleaned);
  });
}
