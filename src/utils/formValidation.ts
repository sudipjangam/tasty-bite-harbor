/**
 * Centralized Form Validation Utilities
 * Provides consistent validation across all forms in the application
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a phone number
 * Requirements: Exactly 10 digits, numeric only
 * @param phone - The phone number to validate
 * @param required - Whether the field is required
 * @returns ValidationResult
 */
export function validatePhone(phone: string, required: boolean = false): ValidationResult {
  // Remove whitespace for validation
  const trimmed = phone.trim();
  
  // If not required and empty, it's valid
  if (!required && !trimmed) {
    return { isValid: true };
  }
  
  // If required and empty, it's invalid
  if (required && !trimmed) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  // Strip all non-numeric characters
  const digitsOnly = trimmed.replace(/\D/g, '');
  
  // Check if it contains only digits
  if (digitsOnly !== trimmed) {
    return { isValid: false, error: 'Phone number must contain only digits' };
  }
  
  // Check if it's exactly 10 digits
  if (digitsOnly.length !== 10) {
    return { isValid: false, error: 'Phone number must be exactly 10 digits' };
  }
  
  return { isValid: true };
}

/**
 * Validates an email address
 * @param email - The email address to validate
 * @param required - Whether the field is required
 * @returns ValidationResult
 */
export function validateEmail(email: string, required: boolean = false): ValidationResult {
  const trimmed = email.trim();
  
  // If not required and empty, it's valid
  if (!required && !trimmed) {
    return { isValid: true };
  }
  
  // If required and empty, it's invalid
  if (required && !trimmed) {
    return { isValid: false, error: 'Email address is required' };
  }
  
  // Standard email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
}

/**
 * Validates a name field
 * Requirements: Non-empty if required, minimum 2 characters, letters and spaces only
 * @param name - The name to validate
 * @param required - Whether the field is required
 * @param minLength - Minimum length (default: 2)
 * @returns ValidationResult
 */
export function validateName(
  name: string,
  required: boolean = true,
  minLength: number = 2
): ValidationResult {
  const trimmed = name.trim();
  
  // If not required and empty, it's valid
  if (!required && !trimmed) {
    return { isValid: true };
  }
  
  // If required and empty, it's invalid
  if (required && !trimmed) {
    return { isValid: false, error: 'Name is required' };
  }
  
  // Check minimum length
  if (trimmed.length < minLength) {
    return {
      isValid: false,
      error: `Name must be at least ${minLength} characters`,
    };
  }
  
  // Check if it contains only letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Name can only contain letters, spaces, hyphens, and apostrophes',
    };
  }
  
  return { isValid: true };
}

/**
 * Validates a number field
 * @param value - The value to validate
 * @param options - Validation options
 * @returns ValidationResult
 */
export function validateNumber(
  value: string | number,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    positiveOnly?: boolean;
    allowDecimals?: boolean;
  } = {}
): ValidationResult {
  const {
    required = false,
    min,
    max,
    positiveOnly = false,
    allowDecimals = true,
  } = options;
  
  const stringValue = String(value).trim();
  
  // If not required and empty, it's valid
  if (!required && !stringValue) {
    return { isValid: true };
  }
  
  // If required and empty, it's invalid
  if (required && !stringValue) {
    return { isValid: false, error: 'This field is required' };
  }
  
  // Parse the number
  const numValue = allowDecimals ? parseFloat(stringValue) : parseInt(stringValue, 10);
  
  // Check if it's a valid number
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  // Check if decimals are allowed
  if (!allowDecimals && stringValue.includes('.')) {
    return { isValid: false, error: 'Decimals are not allowed' };
  }
  
  // Check if positive only
  if (positiveOnly && numValue < 0) {
    return { isValid: false, error: 'Value must be positive' };
  }
  
  // Check minimum value
  if (min !== undefined && numValue < min) {
    return { isValid: false, error: `Value must be at least ${min}` };
  }
  
  // Check maximum value
  if (max !== undefined && numValue > max) {
    return { isValid: false, error: `Value must be at most ${max}` };
  }
  
  return { isValid: true };
}

/**
 * Validates a text field
 * @param text - The text to validate
 * @param options - Validation options
 * @returns ValidationResult
 */
export function validateText(
  text: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    allowSpecialChars?: boolean;
  } = {}
): ValidationResult {
  const {
    required = false,
    minLength,
    maxLength,
    allowSpecialChars = true,
  } = options;
  
  const trimmed = text.trim();
  
  // If not required and empty, it's valid
  if (!required && !trimmed) {
    return { isValid: true };
  }
  
  // If required and empty, it's invalid
  if (required && !trimmed) {
    return { isValid: false, error: 'This field is required' };
  }
  
  // Check minimum length
  if (minLength !== undefined && trimmed.length < minLength) {
    return {
      isValid: false,
      error: `Must be at least ${minLength} characters`,
    };
  }
  
  // Check maximum length
  if (maxLength !== undefined && trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `Must be at most ${maxLength} characters`,
    };
  }
  
  // Check for special characters if not allowed
  if (!allowSpecialChars) {
    const specialCharsRegex = /[^a-zA-Z0-9\s]/;
    if (specialCharsRegex.test(trimmed)) {
      return {
        isValid: false,
        error: 'Special characters are not allowed',
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Input handler for phone fields
 * Restricts input to numeric characters only and limits to 10 digits
 * @param value - The input value
 * @returns Sanitized value
 */
export function handlePhoneInput(value: string): string {
  // Remove all non-numeric characters
  const digitsOnly = value.replace(/\D/g, '');
  // Limit to 10 digits
  return digitsOnly.slice(0, 10);
}

/**
 * Input handler for email fields
 * Trims whitespace
 * @param value - The input value
 * @returns Sanitized value
 */
export function handleEmailInput(value: string): string {
  return value.trim();
}

/**
 * Input handler for name fields
 * Allows only letters, spaces, hyphens, and apostrophes
 * @param value - The input value
 * @returns Sanitized value
 */
export function handleNameInput(value: string): string {
  // Allow only letters, spaces, hyphens, and apostrophes
  return value.replace(/[^a-zA-Z\s\-']/g, '');
}

/**
 * Input handler for number fields
 * @param value - The input value
 * @param allowDecimals - Whether to allow decimal points
 * @param allowNegative - Whether to allow negative numbers
 * @returns Sanitized value
 */
export function handleNumberInput(
  value: string,
  allowDecimals: boolean = true,
  allowNegative: boolean = false
): string {
  let sanitized = value;
  
  // Handle negative sign
  if (!allowNegative) {
    sanitized = sanitized.replace(/-/g, '');
  } else {
    // Keep only the first negative sign at the start
    const hasNegative = sanitized.startsWith('-');
    sanitized = sanitized.replace(/-/g, '');
    if (hasNegative) {
      sanitized = '-' + sanitized;
    }
  }
  
  // Handle decimal point
  if (allowDecimals) {
    // Keep only the first decimal point
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }
  } else {
    sanitized = sanitized.replace(/\./g, '');
  }
  
  // Remove all non-numeric characters except - and .
  sanitized = sanitized.replace(/[^\d.-]/g, '');
  
  return sanitized;
}
