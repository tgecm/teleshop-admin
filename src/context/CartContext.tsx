import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchCart, syncCart, clearServerCart } from '../api/cart';

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  selected_color: string | null;
  selected_options: Record<string, string> | null;
}

export interface CartState {
  items: CartItem[];
  cartCount: number;
  totalAmount: number;
  loading: boolean;
  addItem: (product: { id: number; name: string; price: number; image_url: string }, colorHex?: string | null, selectedOptions?: Record<string, string> | null) => void;
  updateQty: (productId: number, delta: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
}

const CART_KEY = 'ecommerce_cart';

function getCartKey(slug: string, viewMode: string): string {
  const base = CART_KEY + '_' + (slug || 'domain');
  if (viewMode === 'guest') return base + '_guest';
  if (viewMode === 'ecommerce') return base + '_user';
  return base;
}

function saveToLS(slug: string, viewMode: string, items: CartItem[]) {
  try {
    localStorage.setItem(getCartKey(slug, viewMode), JSON.stringify(items));
  } catch {}
}

function loadFromLS(slug: string, viewMode: string): CartItem[] {
  try {
    const saved = localStorage.getItem(getCartKey(slug, viewMode));
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function useCartState(botId: number | undefined, shopSlug: string, user: { uid: string } | null, viewMode: string): CartState {
  const [items, setItems] = useState<CartItem[]>(() => {
    // Initialize from localStorage immediately
    if (shopSlug) return loadFromLS(shopSlug, viewMode);
    return [];
  });
  const [loading, setLoading] = useState(true);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevViewMode = useRef(viewMode);

  const isGuest = !user?.uid || viewMode === 'guest';
  const firebaseUid = viewMode === 'guest' ? '' : (user?.uid || '');

  // When viewMode changes: save current items to the OLD key before loading from NEW key
  useEffect(() => {
    if (prevViewMode.current !== viewMode && shopSlug) {
      const oldKey = getCartKey(shopSlug, prevViewMode.current);
      localStorage.setItem(oldKey, JSON.stringify(items));
      prevViewMode.current = viewMode;
      setLoading(true);
    }
  }, [viewMode, shopSlug, items]);

  // Load from server and merge when botId becomes available (once on mount)
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!botId || !shopSlug || loadedRef.current) return;
    loadedRef.current = true;

    const loadCart = async () => {
      const key = getCartKey(shopSlug, viewMode);
      const localItems = loadFromLS(shopSlug, viewMode);

      // For logged-in user: load from server and merge
      if (firebaseUid) {
        try {
          const serverItems = await fetchCart(botId, firebaseUid);
          if (serverItems?.length > 0) {
            const merged = new Map<number, CartItem>();
            for (const si of serverItems) merged.set(si.product_id, si);
            for (const li of localItems) {
              if (!merged.has(li.product_id)) merged.set(li.product_id, li);
            }
            const mergedItems = Array.from(merged.values());
            setItems(mergedItems);
            saveToLS(shopSlug, viewMode, mergedItems);
            return;
          }
        } catch {}
      }

      // If local has items, set them. Otherwise try old key.
      if (localItems.length > 0) {
        setItems(localItems);
      } else if (firebaseUid) {
        // Try old key (pre-suffix) for backward compat
        try {
          const oldKey = CART_KEY + '_' + shopSlug;
          const oldSaved = localStorage.getItem(oldKey);
          if (oldSaved) {
            const oldItems: CartItem[] = JSON.parse(oldSaved);
            if (oldItems.length > 0) {
              setItems(oldItems);
              saveToLS(shopSlug, viewMode, oldItems);
              localStorage.removeItem(oldKey);
            }
          }
        } catch {}
      }
    };

    loadCart().finally(() => setLoading(false));
  }, [botId, shopSlug, viewMode, firebaseUid, setLoading]);

  // Set loading=false after mount even if botId never comes
  useEffect(() => {
    if (!botId || !shopSlug) {
      setLoading(false);
    }
  }, [botId, shopSlug]);

  // Debounced server sync for logged-in users
  useEffect(() => {
    if (!firebaseUid || !botId) return;

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncCart(botId, firebaseUid, items);
    }, 500);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [items, firebaseUid, botId]);

  const addItem = useCallback((product: { id: number; name: string; price: number; image_url: string }, colorHex?: string | null, selectedOptions?: Record<string, string> | null) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      const newItems: CartItem[] = existing
        ? prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, {
            product_id: product.id,
            name: product.name,
            price: Number(product.price),
            quantity: 1,
            image_url: product.image_url || '',
            selected_color: colorHex || null,
            selected_options: selectedOptions || null,
          }];
      if (shopSlug) saveToLS(shopSlug, viewMode, newItems);
      return newItems;
    });
  }, [shopSlug, viewMode]);

  const updateQty = useCallback((productId: number, delta: number) => {
    setItems(prev => {
      const newItems = prev.map(i => {
        if (i.product_id !== productId) return i;
        const newQty = i.quantity + delta;
        return newQty <= 0 ? null : { ...i, quantity: newQty };
      }).filter(Boolean) as CartItem[];
      if (shopSlug) saveToLS(shopSlug, viewMode, newItems);
      return newItems;
    });
  }, [shopSlug, viewMode]);

  const removeItem = useCallback((productId: number) => {
    setItems(prev => {
      const newItems = prev.filter(i => i.product_id !== productId);
      if (shopSlug) saveToLS(shopSlug, viewMode, newItems);
      return newItems;
    });
  }, [shopSlug, viewMode]);

  const clearCart = useCallback(() => {
    setItems([]);
    if (shopSlug) saveToLS(shopSlug, viewMode, []);
    if (firebaseUid && botId) {
      clearServerCart(botId, firebaseUid);
    }
  }, [firebaseUid, botId, shopSlug, viewMode]);

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return { items, cartCount, totalAmount, loading, addItem, updateQty, removeItem, clearCart };
}
