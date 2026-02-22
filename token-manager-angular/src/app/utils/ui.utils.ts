import { ToastMessage, LoadingState } from '../types';

/**
 * UI utility functions
 * Helper functions for user interface operations
 */

/**
 * Create toast message
 */
export const createToast = (
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
): ToastMessage => ({
  message,
  type
});

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format date for display
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Debounce function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: any;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

/**
 * Throttle function calls
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let lastFunc: any;
  let lastRan: number;

  return (...args: Parameters<T>) => {
    if (!lastRan) {
      func.apply(null, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func.apply(null, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or insecure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Create loading state object
 */
export const createLoadingState = (
  isLoading: boolean,
  message?: string
): LoadingState => ({
  isLoading,
  message
});

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitize filename for download
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-z0-9.-]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
};

/**
 * Generate safe CSS class name from string
 */
export const toCssClassName = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Parse query string parameters
 */
export const parseQueryParams = (queryString: string): Record<string, string> => {
  const params: Record<string, string> = {};
  const pairs = queryString.replace(/^\?/, '').split('&');

  pairs.forEach(pair => {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  });

  return params;
};

/**
 * Create query string from parameters
 */
export const createQueryString = (params: Record<string, string | number | boolean>): string => {
  const pairs = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return pairs.length > 0 ? `?${pairs.join('&')}` : '';
};

/**
 * Check if an element is visible in viewport
 */
export const isElementInViewport = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Scroll element into view smoothly
 */
export const scrollIntoView = (element: HTMLElement, behavior: 'smooth' | 'auto' = 'smooth'): void => {
  element.scrollIntoView({ behavior, block: 'center' });
};

/**
 * Get text color based on background color brightness
 */
export const getContrastingTextColor = (backgroundColor: string): 'black' | 'white' => {
  // Convert color to RGB values
  let r: number, g: number, b: number;

  if (backgroundColor.startsWith('#')) {
    const hex = backgroundColor.slice(1);
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else if (backgroundColor.startsWith('rgb')) {
    const match = backgroundColor.match(/\d+/g);
    if (match) {
      [r, g, b] = match.map(Number);
    } else {
      return 'black';
    }
  } else {
    return 'black';
  }

  // Calculate brightness using YIQ formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 128 ? 'black' : 'white';
};

/**
 * Create CSS custom properties string from tokens
 */
export const createCssCustomProperties = (tokens: Record<string, any>): string => {
  const properties: string[] = [];

  const processTokens = (obj: any, prefix: string = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const propertyName = prefix ? `${prefix}-${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if ((value as any).$value !== undefined) {
          // This is a token
          properties.push(`  --${propertyName}: ${(value as any).$value};`);
        } else {
          // This is a group, recurse
          processTokens(value, propertyName);
        }
      } else {
        // Direct value
        properties.push(`  --${propertyName}: ${value};`);
      }
    }
  };

  processTokens(tokens);
  return `:root {\n${properties.join('\n')}\n}`;
};

/**
 * Escape HTML to prevent XSS
 */
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Generate random color for avatar/placeholder
 */
export const generateRandomColor = (seed?: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#C44569', '#F8B500', '#A4B0BD', '#F53B57', '#3C40C6'
  ];

  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  return colors[Math.floor(Math.random() * colors.length)];
};