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
    if (key === 'value' || key === '$value') {
      // Strip .value suffix from SD reference strings (e.g. {token.color.base.blue.200.value} → {token.color.base.blue.200})
      const normalized = (typeof val === 'string' && val.startsWith('{') && val.endsWith('}'))
        ? val.replace(/\.value\}$/, '}')
        : val;
      result['$value'] = normalized;
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
 * JS/TS reserved keywords that may appear as token group names.
 * When style-dictionary emits javascript/es6 output it produces:
 *   export const default = "..."   ← syntax error
 * We rename matching keys to append an underscore suffix: default → default_
 *
 * Only token group name keys are renamed (not SD meta-keys like $value, $type).
 */
const JS_RESERVED_KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
  'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new',
  'null', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true',
  'false', 'try', 'type', 'typeof', 'undefined', 'var', 'void', 'while',
  'with', 'yield', 'enum', 'interface', 'implements', 'package', 'private',
  'protected', 'public', 'abstract', 'as', 'async', 'await', 'from', 'of',
]);

/**
 * Recursively walk the token tree and rename any token-group key that is a
 * JS reserved keyword by appending an underscore suffix (e.g. default → default_).
 * SD meta-keys ($value, $type, $description) are never renamed.
 */
function sanitizeTokenKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    // Never rename SD meta-keys
    const isMetaKey = key.startsWith('$');
    const safeKey = !isMetaKey && JS_RESERVED_KEYWORDS.has(key) ? `${key}_` : key;

    if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[safeKey] = sanitizeTokenKeys(val as Record<string, unknown>);
    } else {
      result[safeKey] = val;
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

  // Sanitize reserved JS keywords in token group names before passing to SD.
  // Tokens from MongoDB are already wrapped with a namespace key (e.g. { token: { ... } })
  // so we pass them directly — no additional wrapping to avoid --token-token-... double prefix.
  const sanitizedTokens = sanitizeTokenKeys(normalizedBrandTokens);

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
        tokens: sanitizedTokens as Record<string, never>,
        platforms: {
          [fmt]: {
            transformGroup,
            // No prefix: the token tree already contains the namespace as its root key
            // (e.g. { token: { common: { ... } } }) so SD derives --token-common-...
            // directly from the path. Adding prefix here would produce --token-token-...
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
        // Treat broken token references as console output, not thrown errors.
        // Tokens stored in MongoDB may contain reference values (e.g. {colors.primary})
        // that point outside the current brand's token set after globals merging.
        // SD v5 validates references internally even when outputReferences: false — this
        // config prevents those validation failures from throwing and aborting the build.
        // logBrokenReferenceLevels: 'throw' | 'console' (no 'warn' in SD v5 types)
        log: {
          verbosity: 'silent',
          warnings: 'disabled',
          errors: { brokenReferences: 'console' },
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
 * Build combined light+dark output for CSS, SCSS, LESS, JS, and TS formats.
 *
 * CSS/SCSS/LESS strategy: run SD for each token set separately, then post-process:
 *   - Light output: unchanged (:root { ... })
 *   - Dark output: replace ':root {' with '[data-color-mode="dark"] {'
 *   - Combined: lightContent + '\n\n' + darkContent
 *
 * JS/TS strategy: run SD for dark tokens with '${namespace}Dark' namespace prefix,
 * producing differently-named exports (e.g. TokenDarkColorPrimary), then concatenate.
 *
 * JSON format: not combined — dark tokens are omitted from JSON (JSON format excluded
 * per existing COMMENT_FORMATS pattern; no comments, no dark block needed).
 *
 * Safety: if ':root {' is not found in dark SD output, log a warning and wrap manually.
 */
async function buildCombinedOutput(
  lightTokens: Record<string, unknown>,
  darkTokens: Record<string, unknown>,
  namespace: string,
  brand: string
): Promise<Map<Format, string>> {
  const results = new Map<Format, string>();

  // Build both token sets
  const lightMap = await buildBrandTokens(lightTokens, namespace, brand);
  const darkMap  = await buildBrandTokens(darkTokens, `${namespace}Dark`, `${brand}-dark`);

  const CSS_FORMATS: Format[] = ['css', 'scss', 'less'];
  const JS_FORMATS:  Format[] = ['js', 'ts'];

  // CSS/SCSS/LESS: replace :root { with [data-color-mode="dark"] { in dark output
  for (const fmt of CSS_FORMATS) {
    const lightContent = lightMap.get(fmt) ?? '';
    const rawDark = darkMap.get(fmt) ?? '';

    const darkSelector = '[data-color-mode="dark"]';
    let darkContent: string;

    if (rawDark.includes(':root {')) {
      darkContent = rawDark.replace(':root {', `${darkSelector} {`);
    } else {
      // Safety fallback: SD output changed format — wrap manually
      console.warn(`[buildCombinedOutput] Expected ':root {' in ${fmt} dark output but not found. Wrapping manually.`);
      darkContent = `${darkSelector} {\n${rawDark}\n}`;
    }

    results.set(fmt, `${lightContent}\n\n${darkContent}`);
  }

  // JS/TS: namespace prefix approach — light uses 'namespace', dark uses 'namespaceDark'
  // Results in: TokenColorPrimary = "..." (light) + TokenDarkColorPrimary = "..." (dark)
  for (const fmt of JS_FORMATS) {
    const lightContent = lightMap.get(fmt) ?? '';
    const darkContent  = darkMap.get(fmt) ?? '';
    results.set(fmt, `${lightContent}\n\n/* Dark mode tokens */\n${darkContent}`);
  }

  // JSON: pass through light only (JSON spec forbids comments; no dark block structure)
  results.set('json', lightMap.get('json') ?? '');

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
  const { tokens, namespace, collectionName, darkTokens, colorMode } = request;

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
    let builtFormats: Map<Format, string>;

    if (darkTokens) {
      // Combined light+dark output: detect dark brands the same way
      const rawDarkBrands = detectBrands(darkTokens);
      const darkBrands = mergeGlobalsIntoBrands(rawDarkBrands);
      // Match by brand name; fall back to first dark brand if no name match
      const darkBrand = darkBrands.find(b => b.brand === brand) ?? darkBrands[0];
      if (darkBrand) {
        builtFormats = await buildCombinedOutput(brandTokens, darkBrand.tokens, namespace, brand);
      } else {
        builtFormats = await buildBrandTokens(brandTokens, namespace, brand);
      }
    } else {
      builtFormats = await buildBrandTokens(brandTokens, namespace, brand);
    }

    // When a dark-mode theme is exported directly, replace :root { with the dark selector
    if (colorMode === 'dark' && !darkTokens) {
      const darkSelector = '[data-color-mode="dark"]';
      for (const fmt of (['css', 'scss', 'less'] as Format[])) {
        const content = builtFormats.get(fmt) ?? '';
        if (content.includes(':root {')) {
          builtFormats.set(fmt, content.replace(':root {', `${darkSelector} {`));
        }
      }
    }

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
