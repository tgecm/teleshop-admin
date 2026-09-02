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

export function sanitizeSpecPrices(specPrices, colors = [], options = []) {
  if (!Array.isArray(specPrices)) return [];

  const colorNames = new Set(colors.map(c => (c.name || c.color || '').trim().toLowerCase()).filter(Boolean));

  const validOptKeys = new Map();
  options.forEach(opt => {
    const valSet = new Set((opt.values || []).map(v => (v.label || v.name || v.id || '').trim().toLowerCase()).filter(Boolean));
    if (opt.id) validOptKeys.set(String(opt.id).trim().toLowerCase(), valSet);
    if (opt.name) validOptKeys.set(String(opt.name).trim().toLowerCase(), valSet);
  });

  return specPrices.map(sp => {
    if (!sp || typeof sp !== 'object') return null;
    let newColor = sp.color;
    if (newColor && colorNames.size > 0) {
      if (!colorNames.has(String(newColor).trim().toLowerCase())) {
        newColor = null;
      }
    }

    const newOpts = {};
    if (sp.options && typeof sp.options === 'object') {
      Object.entries(sp.options).forEach(([rk, rv]) => {
        if (rv === null || rv === undefined || rv === '') return;
        const keyLower = String(rk).trim().toLowerCase();
        const valLower = String(rv).trim().toLowerCase();

        if (validOptKeys.size > 0) {
          const valSet = validOptKeys.get(keyLower);
          if (!valSet || !valSet.has(valLower)) {
            return;
          }
        }
        newOpts[rk] = rv;
      });
    }

    return {
      ...sp,
      color: newColor,
      options: newOpts
    };
  }).filter(Boolean);
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

  const normOptions = productOptions.map(opt => {
    const oId = opt.id ? String(opt.id).trim().toLowerCase() : '';
    const oName = opt.name ? String(opt.name).trim().toLowerCase() : '';
    const values = (opt.values || []).map(v => {
      if (typeof v === 'string') {
        const strVal = v.trim().toLowerCase();
        return { id: strVal, label: strVal };
      }
      const vId = v?.id ? String(v.id).trim().toLowerCase() : '';
      const vLabel = v?.label ? String(v.label).trim().toLowerCase() : (v?.name ? String(v.name).trim().toLowerCase() : '');
      const fallbackStr = (vId || vLabel || String(v || '')).trim().toLowerCase();
      return { id: vId || fallbackStr, label: vLabel || fallbackStr };
    });
    return { id: oId, name: oName, values };
  });

  const userSelections = new Map();

  if (selectedOptions && typeof selectedOptions === 'object') {
    Object.entries(selectedOptions).forEach(([optKey, valVal]) => {
      if (valVal === null || valVal === undefined || valVal === '') return;
      const kLower = String(optKey).trim().toLowerCase();
      const vLower = String(valVal).trim().toLowerCase();

      const optMatch = normOptions.find(o => o.id === kLower || o.name === kLower);
      if (optMatch) {
        const valMatch = optMatch.values.find(v => v.id === vLower || v.label === vLower);
        const identifiers = new Set([vLower]);
        if (valMatch) {
          if (valMatch.id) identifiers.add(valMatch.id);
          if (valMatch.label) identifiers.add(valMatch.label);
        }
        userSelections.set(optMatch, identifiers);
      } else {
        const fallbackOpt = { id: kLower, name: kLower, values: [] };
        userSelections.set(fallbackOpt, new Set([vLower]));
      }
    });
  }

  // Sort rules by specificity: (color + options) -> more options -> fewer options
  const sortedRules = [...specPrices].sort((a, b) => {
    const aOptsCount = Object.keys(a.options || {}).length;
    const bOptsCount = Object.keys(b.options || {}).length;
    const aHasColor = a.color ? 1 : 0;
    const bHasColor = b.color ? 1 : 0;
    const scoreA = (aHasColor * 1000) + aOptsCount;
    const scoreB = (bHasColor * 1000) + bOptsCount;
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

        const optMatch = normOptions.find(o => o.id === ruleOptKey || o.name === ruleOptKey);
        
        if (normOptions.length > 0 && !optMatch) {
          continue; // Ignore deleted option rule key
        }

        let selectedValSet = null;
        if (optMatch) {
          selectedValSet = userSelections.get(optMatch);
        } else {
          for (const [optObj, valSet] of userSelections.entries()) {
            if (optObj.id === ruleOptKey || optObj.name === ruleOptKey) {
              selectedValSet = valSet;
              break;
            }
          }
        }

        if (!selectedValSet) {
          optionsMatch = false;
          break;
        }

        let valMatches = selectedValSet.has(ruleOptVal);
        if (!valMatches && optMatch) {
          const ruleValMatch = optMatch.values.find(v => v.id === ruleOptVal || v.label === ruleOptVal);
          if (ruleValMatch) {
            if (ruleValMatch.id && selectedValSet.has(ruleValMatch.id)) valMatches = true;
            if (ruleValMatch.label && selectedValSet.has(ruleValMatch.label)) valMatches = true;
          }
        }

        if (!valMatches) {
          optionsMatch = false;
          break;
        }
      }

      if (!optionsMatch) continue;
    }

    return rulePrice;
  }

  return basePrice;
}
