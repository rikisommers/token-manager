/**
 * Style Dictionary Build Service — server-side only.
 * Accepts raw token JSON and returns formatted output strings for all 6 formats.
 * Does NOT write to disk — all output captured in-memory via formatPlatform().
 */

import StyleDictionary from 'style-dictionary';
import type { BuildTokensRequest, BuildTokensResult, FormatOutput, BrandFormatOutput } from '@/types';

const FORMATS = ['css', 'scss', 'less', 'js', 'ts', 'json'] as const;
type Format = typeof FORMATS[number];

/**
 * Detect brand groups from token structure.
 *
 * Structure A (flat): { colors: {...}, spacing: {...} }
 *   → single brand "globals": tokens = the whole object
 *
 * Structure B (file-path keyed): { "globals/color-base.json": {...}, "brands/brand1.json": {...} }
 *   → group by first path segment.
 */
function detectBrands(tokens: Record<string, unknown>): { brand: string; tokens: Record<string, unknown> }[] {
  const keys = Object.keys(tokens);
  const isFilePath = keys.some(k => k.includes('/'));

  if (isFilePath) {
    // File-path keyed: group by first segment
    const brandMap = new Map<string, Record<string, unknown>>();
    for (const [filePath, data] of Object.entries(tokens)) {
      const brand = filePath.split('/')[0];
      if (!brandMap.has(brand)) brandMap.set(brand, {});
      const existing = brandMap.get(brand)!;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        Object.assign(existing, data as Record<string, unknown>);
      }
    }
    return Array.from(brandMap.entries()).map(([brand, t]) => ({ brand, tokens: t }));
  }

  // Flat structure: single brand
  return [{ brand: 'globals', tokens }];
}

/**
 * Deep-merge source into target (non-destructive: target keys win on conflict).
 * Used to merge globals tokens into each brand's token object.
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...source };
  for (const [key, targetVal] of Object.entries(target)) {
    if (
      key in result &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal) &&
      result[key] &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        result[key] as Record<string, unknown>
      );
    } else {
      result[key] = targetVal;
    }
  }
  return result;
}

/**
 * Merge the "globals" brand token object into every non-globals brand.
 * This makes each brand file self-contained (includes shared palette/global tokens).
 * The "globals" brand entry is removed from the output — it is only used as a merge source.
 *
 * If there is only one brand (and it is "globals"), return it as-is (single-brand collection).
 */
function mergeGlobalsIntoBrands(
  brands: { brand: string; tokens: Record<string, unknown> }[]
): { brand: string; tokens: Record<string, unknown> }[] {
  const globalsEntry = brands.find(b => b.brand === 'globals');
  const nonGlobalsBrands = brands.filter(b => b.brand !== 'globals');

  // Single-brand or no globals to merge
  if (!globalsEntry || nonGlobalsBrands.length === 0) {
    return brands;
  }

  // Merge globals into every non-globals brand (brand-specific tokens win on key conflict)
  return nonGlobalsBrands.map(({ brand, tokens: brandTokens }) => ({
    brand,
    tokens: deepMerge(brandTokens, globalsEntry.tokens),
  }));
}

/**
 * Normalize token keys: style-dictionary v5 uses $value/$type (W3C DTCG spec).
 * Our stored tokens may use `value`/`type` — convert before passing to SD.
 */
function normalizeTokens(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'value') {
      result['$value'] = val;
    } else if (key === 'type') {
      result['$type'] = val;
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = normalizeTokens(val as Record<string, unknown>);
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Build a single brand's tokens into all 6 formats using style-dictionary v5 programmatic API.
 * Returns a map from format name to file content string.
 */
async function buildBrandTokens(
  brandTokens: Record<string, unknown>,
  namespace: string,
  brand: string
): Promise<Map<Format, string>> {
  const results = new Map<Format, string>();

  const normalizedBrandTokens = normalizeTokens(brandTokens);

  // Wrap in namespace: { [namespace]: normalizedTokens }
  // Variable names: --{namespace}-{path} e.g. --token-colors-primary
  const wrappedTokens = {
    [namespace || 'token']: normalizedBrandTokens,
  };

  const formatConfigs: Record<Format, { formatter: string; extension: string; transformGroup: string }> = {
    css:  { formatter: 'css/variables',                transformGroup: 'css', extension: 'css' },
    scss: { formatter: 'scss/variables',               transformGroup: 'css', extension: 'scss' },
    less: { formatter: 'less/variables',               transformGroup: 'css', extension: 'less' },
    js:   { formatter: 'javascript/es6',               transformGroup: 'js',  extension: 'js' },
    ts:   { formatter: 'typescript/es6-declarations',  transformGroup: 'js',  extension: 'd.ts' },
    json: { formatter: 'json/nested',                  transformGroup: 'js',  extension: 'json' },
  };

  for (const [fmt, { formatter, extension, transformGroup }] of Object.entries(formatConfigs) as [Format, { formatter: string; extension: string; transformGroup: string }][]) {
    try {
      const sd = new StyleDictionary({
        tokens: wrappedTokens as Record<string, never>,
        platforms: {
          [fmt]: {
            transformGroup,
            prefix: namespace || 'token',
            files: [
              {
                destination: `tokens-${brand}.${extension}`,
                format: formatter,
                options: {
                  outputReferences: false,
                },
              },
            ],
          },
        },
      });

      // SD v5: must call init() before formatPlatform()
      await sd.init();

      // formatPlatform returns array of { output: string, destination: string }
      const platformFiles = await sd.formatPlatform(fmt);
      let capturedContent = '';
      if (Array.isArray(platformFiles) && platformFiles.length > 0) {
        capturedContent = (platformFiles[0] as { output: string; destination: string }).output ?? '';
      }

      results.set(fmt, capturedContent);
    } catch (err) {
      // Format failed — store empty string with error comment
      results.set(fmt, `/* Build error for ${fmt}: ${err instanceof Error ? err.message : String(err)} */`);
    }
  }

  return results;
}

/**
 * Main export: build all formats for all brands from raw token JSON.
 *
 * GLOBALS MERGING: globals tokens are merged into every non-globals brand so each
 * output file is self-contained (user decision — locked). The "globals" brand is NOT
 * emitted as a separate output file when non-globals brands exist.
 */
export async function buildTokens(request: BuildTokensRequest): Promise<BuildTokensResult> {
  const { tokens, namespace, collectionName } = request;

  const rawBrands = detectBrands(tokens);

  // Merge globals into each non-globals brand (user decision: each brand file is self-contained)
  const brands = mergeGlobalsIntoBrands(rawBrands);

  const formatOutputs = new Map<Format, FormatOutput>();

  // Initialize format outputs
  for (const fmt of FORMATS) {
    formatOutputs.set(fmt, { format: fmt, outputs: [] });
  }

  // Build each brand
  for (const { brand, tokens: brandTokens } of brands) {
    const builtFormats = await buildBrandTokens(brandTokens, namespace, brand);

    for (const fmt of FORMATS) {
      const content = builtFormats.get(fmt) ?? '';
      const ext = fmt === 'ts' ? 'd.ts' : fmt;
      const filename = `tokens-${brand}.${ext}`;
      formatOutputs.get(fmt)!.outputs.push({ brand, content, filename } as BrandFormatOutput);
    }
  }

  return {
    formats: Array.from(formatOutputs.values()),
    collectionName,
  };
}
