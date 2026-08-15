import { getColorName } from '../data/colors';

export function resolveColorName(selectedColor, product) {
  if (!selectedColor) return null;
  const colorStr = typeof selectedColor === 'string' ? selectedColor : (selectedColor.color || selectedColor.name || '');
  if (!colorStr) return null;

  let specs = product?.specifications;
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs); } catch (e) { specs = null; }
  }
  const colors = specs?.colors || [];
  if (Array.isArray(colors)) {
    const match = colors.find(c =>
      (c.color && c.color.toLowerCase() === colorStr.toLowerCase()) ||
      (c.name && c.name.toLowerCase() === colorStr.toLowerCase())
    );
    if (match && match.name) return match.name;
  }

  return getColorName(colorStr) || colorStr;
}

export function resolveProductPrice(product, selectedColor, selectedOptions = {}) {
  const basePrice = Number(product?.price || 0);
  if (!product?.spec_prices) return basePrice;
  let specPrices = product.spec_prices;
  if (typeof specPrices === 'string') {
    try { specPrices = JSON.parse(specPrices); } catch (e) { return basePrice; }
  }
  if (!Array.isArray(specPrices) || specPrices.length === 0) return basePrice;

  const colorName = resolveColorName(selectedColor, product);
  const colorStr = colorName ? colorName.trim().toLowerCase() : null;

  let specs = product?.specifications;
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs); } catch (e) { specs = null; }
  }
  const productOptions = specs?.options || [];

  const allSelValues = new Set();
  const selOptMap = {};

  if (selectedOptions && typeof selectedOptions === 'object') {
    Object.entries(selectedOptions).forEach(([optKey, valVal]) => {
      if (valVal === null || valVal === undefined || valVal === '') return;

      const optObj = productOptions.find(o => o.id === optKey || o.name === optKey);
      const valObj = optObj?.values?.find(v => v.id === valVal || v.label === valVal);

      const valLabels = new Set();
      valLabels.add(String(valVal).trim().toLowerCase());
      if (valObj) {
        if (valObj.label) valLabels.add(String(valObj.label).trim().toLowerCase());
        if (valObj.id) valLabels.add(String(valObj.id).trim().toLowerCase());
      }

      valLabels.forEach(v => allSelValues.add(v));

      const keyNames = new Set([String(optKey).trim().toLowerCase()]);
      if (optObj) {
        if (optObj.id) keyNames.add(String(optObj.id).trim().toLowerCase());
        if (optObj.name) keyNames.add(String(optObj.name).trim().toLowerCase());
      }

      keyNames.forEach(k => {
        selOptMap[k] = valLabels;
      });
    });
  }

  // Sort rules by specificity: (color + options) -> options only -> color only
  const sortedRules = [...specPrices].sort((a, b) => {
    const aOptsCount = Object.keys(a.options || {}).length;
    const bOptsCount = Object.keys(b.options || {}).length;
    const aHasColor = a.color ? 1 : 0;
    const bHasColor = b.color ? 1 : 0;
    const scoreA = aHasColor * 2 + (aOptsCount > 0 ? 1 : 0);
    const scoreB = bHasColor * 2 + (bOptsCount > 0 ? 1 : 0);
    return scoreB - scoreA;
  });

  for (const sp of sortedRules) {
    const rulePrice = Number(sp.price);
    if (!rulePrice || rulePrice <= 0) continue;

    const spColor = sp.color ? String(sp.color).trim().toLowerCase() : null;
    const spOpts = sp.options || {};
    const spOptEntries = Object.entries(spOpts).filter(([, v]) => v !== null && v !== undefined && v !== '');

    // 1. Color check
    if (spColor) {
      if (!colorStr || colorStr !== spColor) continue;
    }

    // 2. Options check
    if (spOptEntries.length > 0) {
      let optionsMatch = true;
      for (const [rk, rv] of spOptEntries) {
        const ruleOptKey = String(rk).trim().toLowerCase();
        const ruleOptVal = String(rv).trim().toLowerCase();

        const userValSet = selOptMap[ruleOptKey];
        if (userValSet) {
          if (!userValSet.has(ruleOptVal)) {
            optionsMatch = false;
            break;
          }
        } else {
          if (!allSelValues.has(ruleOptVal)) {
            optionsMatch = false;
            break;
          }
        }
      }
      if (!optionsMatch) continue;
    }

    return rulePrice;
  }

  return basePrice;
}
