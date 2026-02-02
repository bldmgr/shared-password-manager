export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export function generatePassword(options: PasswordGeneratorOptions): string {
  let characters = '';
  let password = '';

  if (options.includeUppercase) characters += UPPERCASE;
  if (options.includeLowercase) characters += LOWERCASE;
  if (options.includeNumbers) characters += NUMBERS;
  if (options.includeSymbols) characters += SYMBOLS;

  if (characters.length === 0) {
    characters = LOWERCASE + NUMBERS;
  }

  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);

  for (let i = 0; i < options.length; i++) {
    password += characters[array[i] % characters.length];
  }

  let hasRequired = true;
  if (options.includeUppercase && !/[A-Z]/.test(password)) hasRequired = false;
  if (options.includeLowercase && !/[a-z]/.test(password)) hasRequired = false;
  if (options.includeNumbers && !/[0-9]/.test(password)) hasRequired = false;
  if (options.includeSymbols && !/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) hasRequired = false;

  if (!hasRequired) {
    return generatePassword(options);
  }

  return password;
}

export function getPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
  feedback: string;
} {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  let feedback: string;

  if (score <= 2) {
    strength = 'weak';
    feedback = 'Very weak password. Add more characters and variety.';
  } else if (score <= 4) {
    strength = 'medium';
    feedback = 'Moderate password. Consider adding symbols and length.';
  } else if (score <= 5) {
    strength = 'strong';
    feedback = 'Strong password. Good security.';
  } else {
    strength = 'very-strong';
    feedback = 'Very strong password. Excellent security.';
  }

  return { strength, score, feedback };
}
