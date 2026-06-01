// frontend/src/utils/validators.ts
export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\s|-/g, '');
  return /^(\+?254|0)[17]\d{8}$/.test(cleaned);
};

export const validateAmount = (amount: string): boolean => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

export const validatePasskey = (passkey: string): boolean => {
  return passkey.trim().length >= 4;
};

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateTillNumber = (till: string): boolean => {
  return /^\d{4,10}$/.test(till.trim());
};

export const validatePaybillNumber = (paybill: string): boolean => {
  return /^\d{4,10}$/.test(paybill.trim());
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const getPhoneError = (phone: string): string | null => {
  if (!phone.trim()) return 'Phone number is required.';
  if (!validatePhone(phone)) return 'Enter a valid Kenyan phone number (07xx or 01xx).';
  return null;
};

export const getAmountError = (amount: string): string | null => {
  if (!amount.trim()) return 'Amount is required.';
  if (!validateAmount(amount)) return 'Enter a valid positive amount.';
  return null;
};
