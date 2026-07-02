export function formatPrice(amount, currencyCode = 'MMK') {
  if (amount === null || amount === undefined) return '';
  try {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(amount));
    return `${formatted} ${currencyCode}`;
  } catch {
    return `${Number(amount).toLocaleString()} ${currencyCode}`;
  }
}
