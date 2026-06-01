// frontend/src/utils/converters.ts
const USD_TO_KES_RATE = 150;

export const usdToKes = (usd: number): number => {
  return parseFloat((usd * USD_TO_KES_RATE).toFixed(2));
};

export const kesToUsd = (kes: number): number => {
  return parseFloat((kes / USD_TO_KES_RATE).toFixed(2));
};

export const formatUSD = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `USD ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatKES = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatCurrency = (
  amount: number | string,
  currency: 'USD' | 'KES' = 'KES'
): string => {
  return currency === 'USD' ? formatUSD(Number(amount)) : formatKES(Number(amount));
};

export const getConversionRate = (): number => USD_TO_KES_RATE;

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};
