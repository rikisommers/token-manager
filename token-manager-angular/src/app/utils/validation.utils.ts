import { ValidationResult } from '../types';

/**
 * Validation utility functions
 * Helper functions for various validation tasks
 */

/**
 * Validate GitHub repository format
 */
export const validateGitHubRepository = (repository: string): ValidationResult => {
  const errors: string[] = [];

  if (!repository || !repository.trim()) {
    errors.push('Repository is required');
  } else {
    // Check format: owner/repo
    if (!/^[a-zA-Z0-9\-_.]+\/[a-zA-Z0-9\-_.]+$/.test(repository)) {
      errors.push('Repository must be in format "owner/repository"');
    }

    // Check for valid characters
    if (repository.includes('//') || repository.includes('..')) {
      errors.push('Repository contains invalid characters');
    }

    // Check length limits
    const parts = repository.split('/');
    if (parts.length !== 2) {
      errors.push('Repository must contain exactly one forward slash');
    } else {
      const [owner, repo] = parts;
      if (owner.length > 39) {
        errors.push('Owner name too long (maximum 39 characters)');
      }
      if (repo.length > 100) {
        errors.push('Repository name too long (maximum 100 characters)');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate GitHub token format
 */
export const validateGitHubToken = (token: string): ValidationResult => {
  const errors: string[] = [];

  if (!token || !token.trim()) {
    errors.push('GitHub token is required');
  } else {
    // Check for GitHub token patterns
    if (!/^gh[ps]_[A-Za-z0-9_]{36,}$/.test(token)) {
      errors.push('Invalid GitHub token format. Expected format: ghp_... or ghs_...');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate branch name format
 */
export const validateBranchName = (branch: string): ValidationResult => {
  const errors: string[] = [];

  if (!branch || !branch.trim()) {
    errors.push('Branch name is required');
  } else {
    // Git branch name rules
    if (branch.length > 250) {
      errors.push('Branch name too long (maximum 250 characters)');
    }

    if (/^[-.]/.test(branch) || /[-.]$/.test(branch)) {
      errors.push('Branch name cannot start or end with . or -');
    }

    if (/\.\./.test(branch)) {
      errors.push('Branch name cannot contain consecutive dots (..)');
    }

    if (/[@{\\~^: ]/.test(branch)) {
      errors.push('Branch name contains invalid characters');
    }

    if (/\/$/.test(branch)) {
      errors.push('Branch name cannot end with /');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate Figma token format
 */
export const validateFigmaToken = (token: string): ValidationResult => {
  const errors: string[] = [];

  if (!token || !token.trim()) {
    errors.push('Figma token is required');
  } else {
    // Basic format check (Figma tokens are typically long alphanumeric strings)
    if (token.length < 20) {
      errors.push('Figma token appears to be too short');
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(token)) {
      errors.push('Figma token contains invalid characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate Figma file key format
 */
export const validateFigmaFileKey = (fileKey: string): ValidationResult => {
  const errors: string[] = [];

  if (!fileKey || !fileKey.trim()) {
    errors.push('Figma file key is required');
  } else {
    // Figma file keys are alphanumeric
    if (!/^[A-Za-z0-9]+$/.test(fileKey)) {
      errors.push('Invalid Figma file key format');
    }

    if (fileKey.length < 10 || fileKey.length > 50) {
      errors.push('Figma file key length appears invalid');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];

  if (!email || !email.trim()) {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate URL format
 */
export const validateUrl = (url: string): ValidationResult => {
  const errors: string[] = [];

  if (!url || !url.trim()) {
    errors.push('URL is required');
  } else {
    try {
      new URL(url);
    } catch {
      errors.push('Invalid URL format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate required field
 */
export const validateRequired = (value: any, fieldName: string): ValidationResult => {
  const errors: string[] = [];

  if (value === null || value === undefined || value === '' ||
      (typeof value === 'string' && !value.trim())) {
    errors.push(`${fieldName} is required`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate string length
 */
export const validateStringLength = (
  value: string,
  fieldName: string,
  minLength: number = 0,
  maxLength: number = Infinity
): ValidationResult => {
  const errors: string[] = [];

  if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a string`);
    return { isValid: false, errors };
  }

  if (value.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters`);
  }

  if (value.length > maxLength) {
    errors.push(`${fieldName} must be at most ${maxLength} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate number range
 */
export const validateNumberRange = (
  value: number,
  fieldName: string,
  min: number = -Infinity,
  max: number = Infinity
): ValidationResult => {
  const errors: string[] = [];

  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(`${fieldName} must be a valid number`);
    return { isValid: false, errors };
  }

  if (value < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  }

  if (value > max) {
    errors.push(`${fieldName} must be at most ${max}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate array length
 */
export const validateArrayLength = (
  value: any[],
  fieldName: string,
  minLength: number = 0,
  maxLength: number = Infinity
): ValidationResult => {
  const errors: string[] = [];

  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array`);
    return { isValid: false, errors };
  }

  if (value.length < minLength) {
    errors.push(`${fieldName} must contain at least ${minLength} items`);
  }

  if (value.length > maxLength) {
    errors.push(`${fieldName} must contain at most ${maxLength} items`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate file type
 */
export const validateFileType = (
  file: File,
  allowedTypes: string[]
): ValidationResult => {
  const errors: string[] = [];

  if (!allowedTypes.some(type => file.name.toLowerCase().endsWith(type))) {
    errors.push(`File must be one of: ${allowedTypes.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate file size
 */
export const validateFileSize = (
  file: File,
  maxSize: number
): ValidationResult => {
  const errors: string[] = [];

  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    errors.push(`File size too large (maximum ${maxSizeMB}MB)`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Combine multiple validation results
 */
export const combineValidationResults = (
  ...results: ValidationResult[]
): ValidationResult => {
  const allErrors = results.flatMap(result => result.errors);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

/**
 * Validate form data with schema
 */
export const validateFormData = <T extends Record<string, any>>(
  data: T,
  schema: Record<keyof T, (value: any) => ValidationResult>
): ValidationResult & { fieldErrors: Partial<Record<keyof T, string[]>> } => {
  const fieldErrors: Partial<Record<keyof T, string[]>> = {};
  const allErrors: string[] = [];

  for (const [fieldName, validator] of Object.entries(schema)) {
    const fieldValue = data[fieldName as keyof T];
    const result = validator(fieldValue);

    if (!result.isValid) {
      fieldErrors[fieldName as keyof T] = result.errors;
      allErrors.push(...result.errors);
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    fieldErrors
  };
};