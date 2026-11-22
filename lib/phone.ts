/**
 * Moroccan Phone Number Normalization and Privacy Formatting
 * 
 * Supports:
 * - Local formats: 0612345678, 0712345678, 0512345678
 * - International: +212612345678, 00212612345678, 212612345678
 * - Shorthand without leading zero: 612345678, 712345678
 * - Formatted with spaces/dashes: 06 12 34 56 78, +212 612-345678
 */

export interface PhoneNormalizationResult {
  valid: boolean;
  normalized: string; // E.164 format: +2126XXXXXXXX
  localFormat: string; // 06 12 34 56 78
  displayFormat: string; // +212 612-345678
  masked: string; // +212 6•• •• •• 78 (for privacy)
  error?: string;
}

export function normalizeMoroccoPhone(input: string): PhoneNormalizationResult {
  if (!input || typeof input !== 'string') {
    return {
      valid: false,
      normalized: '',
      localFormat: '',
      displayFormat: '',
      masked: '',
      error: 'Le numéro de téléphone est requis'
    };
  }

  // Remove all non-digit characters except leading '+'
  let cleaned = input.trim().replace(/[\s\-\(\)\.]/g, '');

  // Handle leading '+' or '00'
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  let digitsOnly = cleaned.replace(/\+/g, '');

  // If starts with 212, strip country code to inspect national digits
  let nationalNumber = '';

  if (digitsOnly.startsWith('212')) {
    nationalNumber = digitsOnly.slice(3);
  } else if (digitsOnly.startsWith('0')) {
    nationalNumber = digitsOnly.slice(1);
  } else {
    nationalNumber = digitsOnly;
  }

  // Moroccan mobile/landline numbers have exactly 9 digits in national format
  // Mobile numbers start with 6 or 7. Fixed landlines start with 5.
  if (!/^[567]\d{8}$/.test(nationalNumber)) {
    return {
      valid: false,
      normalized: '',
      localFormat: '',
      displayFormat: '',
      masked: '',
      error: 'Numéro marocain invalide (doit contenir 9 chiffres commençant par 06, 07 ou 05)'
    };
  }

  const normalized = `+212${nationalNumber}`;
  const localFormat = `0${nationalNumber.slice(0, 1)} ${nationalNumber.slice(1, 3)} ${nationalNumber.slice(3, 5)} ${nationalNumber.slice(5, 7)} ${nationalNumber.slice(7, 9)}`;
  const displayFormat = `+212 ${nationalNumber.slice(0, 3)}-${nationalNumber.slice(3)}`;
  const masked = `+212 ${nationalNumber.slice(0, 1)}•• •• •• ${nationalNumber.slice(7)}`;

  return {
    valid: true,
    normalized,
    localFormat,
    displayFormat,
    masked
  };
}

export function maskPhone(phone: string): string {
  const res = normalizeMoroccoPhone(phone);
  if (res.valid) return res.masked;
  if (phone.length > 4) {
    return phone.slice(0, 4) + '••••' + phone.slice(-2);
  }
  return '••••';
}
