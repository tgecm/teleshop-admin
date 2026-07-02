export function formatPrice(amount, currencyCode = 'MMK') {
  if (amount === null || amount === undefined) return '';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${Number(amount).toLocaleString()} ${currencyCode}`;
  }
}
