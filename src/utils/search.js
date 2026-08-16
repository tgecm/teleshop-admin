// Advanced Fuzzy Search Engine with Levenshtein Distance & Tokenization

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
      }
    }
  }
  return matrix[a.length][b.length];
}

export function normalizeSearchText(text) {
  if (!text) return '';
  let s = text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const result = [];
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code >= 0x1D400 && code <= 0x1D7FF) {
      const pos = (code - 0x1D400) % 52;
      result.push(String.fromCharCode(0x61 + (pos < 26 ? pos : pos - 26)));
    } else {
      result.push(ch);
    }
  }
  return result.join('').replace(/[^\w\s\u1000-\u109F]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isFuzzyTokenMatch(qToken, targetTokens, combinedText) {
  if (!qToken) return true;
  if (combinedText.includes(qToken)) return true;

  for (const tToken of targetTokens) {
    if (!tToken) continue;
    if (tToken.includes(qToken) || qToken.includes(tToken)) return true;

    const qLen = qToken.length;
    const tLen = tToken.length;
    if (Math.abs(qLen - tLen) > 2) continue;

    let maxAllowed = 0;
    if (qLen >= 3 && qLen <= 5) maxAllowed = 1;
    else if (qLen > 5) maxAllowed = 2;

    if (maxAllowed > 0 && levenshteinDistance(qToken, tToken) <= maxAllowed) {
      return true;
    }
  }
  return false;
}

export function calculateProductRelevance(product, searchQuery, categoryName = '') {
  if (!searchQuery || !searchQuery.trim()) return { matches: true, score: 100 };

  const normQuery = normalizeSearchText(searchQuery);
  const qTokens = normQuery.split(' ').filter(Boolean);
  if (qTokens.length === 0) return { matches: true, score: 100 };

  const nameNorm = normalizeSearchText(product.name || '');
  const descNorm = normalizeSearchText(product.description || '');
  const catNorm = normalizeSearchText(categoryName || '');
  const codeNorm = normalizeSearchText(product.link_code || product.id?.toString() || '');

  const nameTokens = nameNorm.split(' ').filter(Boolean);
  const descTokens = descNorm.split(' ').filter(Boolean);
  const catTokens = catNorm.split(' ').filter(Boolean);
  const allTargetTokens = [...nameTokens, ...descTokens, ...catTokens];
  const combinedText = `${nameNorm} ${descNorm} ${catNorm} ${codeNorm}`;

  // Match condition: ALL query tokens must match at least one token or text
  const allTokensMatched = qTokens.every(qToken => isFuzzyTokenMatch(qToken, allTargetTokens, combinedText));

  let fallbackMatch = false;
  if (!allTokensMatched && qTokens.length === 1 && qTokens[0].length >= 3) {
    const singleQ = qTokens[0];
    for (const token of nameTokens) {
      const maxDist = singleQ.length >= 6 ? 2 : 1;
      if (levenshteinDistance(singleQ, token) <= maxDist) {
        fallbackMatch = true;
        break;
      }
    }
  }

  if (!allTokensMatched && !fallbackMatch) {
    return { matches: false, score: 0 };
  }

  let score = 0;
  if (nameNorm === normQuery) score += 100;
  else if (nameNorm.startsWith(normQuery)) score += 80;
  else if (nameNorm.includes(normQuery)) score += 60;
  else if (allTokensMatched) score += 40;
  else score += 20;

  if (catNorm.includes(normQuery)) score += 15;
  if (descNorm.includes(normQuery)) score += 10;

  return { matches: true, score };
}

export function filterAndSortProducts(products, searchQuery, selectedCategory = null, categoryMap = {}, sortBy = 'default') {
  if (!Array.isArray(products)) return [];

  let pool = products;

  // Promotion mode: only show products that have a promotion/original price
  if (sortBy === 'promotion') {
    pool = pool.filter(p => p.original_price != null && Number(p.original_price) > 0);
  }

  const matched = [];

  for (const product of pool) {
    if (selectedCategory && product.category_id !== selectedCategory) {
      continue;
    }

    const catName = categoryMap[product.category_id] || '';
    const { matches, score } = calculateProductRelevance(product, searchQuery, catName);

    if (matches) {
      matched.push({ product, score });
    }
  }

  // If search query is entered, prioritize search relevance score
  if (searchQuery && searchQuery.trim()) {
    matched.sort((a, b) => b.score - a.score);
    return matched.map(m => m.product);
  }

  const list = matched.map(m => m.product);

  if (sortBy === 'price-low' || sortBy === 'price_asc') {
    return list.sort((a, b) => (a.price || 0) - (b.price || 0));
  }
  
  if (sortBy === 'price-high' || sortBy === 'price_desc') {
    return list.sort((a, b) => (b.price || 0) - (a.price || 0));
  }

  if (sortBy === 'newest') {
    return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  if (sortBy === 'popular') {
    // Popularity sort: admin sort_order first, then review count & rating, then newest
    return list.sort((a, b) => {
      if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order;
      if (a.sort_order != null) return -1;
      if (b.sort_order != null) return 1;

      const rA = (a.review_count || 0) * 10 + (a.rating || 0);
      const rB = (b.review_count || 0) * 10 + (b.rating || 0);
      if (rA !== rB) return rB - rA;

      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }

  if (sortBy === 'promotion') {
    // Discount percentage sort: highest discount first
    return list.sort((a, b) => {
      const discA = a.original_price ? (a.original_price - a.price) / a.original_price : 0;
      const discB = b.original_price ? (b.original_price - b.price) / b.original_price : 0;
      return discB - discA;
    });
  }

  return list;
}
