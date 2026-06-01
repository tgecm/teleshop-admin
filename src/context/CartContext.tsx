import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchCart, syncCart, clearServerCart } from '../api/cart';

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  selected_color: string | null;
}

export interface CartState {
  items: CartItem[];
  cartCount: number;
  totalAmount: number;
  loading: boolean;
  addItem: (product: { id: number; name: string; price: number; image_url: string }, colorHex?: string | null) => void;
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

export function useCartState(botId: number | undefined, shopSlug: string, user: { uid: string } | null, viewMode: string): CartState {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyRef = useRef<string>('');
  const prevViewMode = useRef(viewMode);

  const isGuest = !user?.uid || viewMode === 'guest';
  const firebaseUid = user?.uid || '';

  // When viewMode changes: save current items to the OLD key before loading from NEW key
  useEffect(() => {
    if (prevViewMode.current !== viewMode && shopSlug) {
      const oldKey = getCartKey(shopSlug, prevViewMode.current);
      localStorage.setItem(oldKey, JSON.stringify(items));
      prevViewMode.current = viewMode;
      setLoading(true);
    }
  }, [viewMode, shopSlug, items]);

  // Load cart on mount or viewMode change — localStorage + optional server merge
  useEffect(() => {
    if (!botId || !shopSlug) return;
    setLoading(true);

    const loadCart = async () => {
      const key = getCartKey(shopSlug, viewMode);
      keyRef.current = key;
      let localItems: CartItem[] = [];
      try {
        const saved = localStorage.getItem(key);
        if (saved) localItems = JSON.parse(saved);
      } catch {}

      // For logged-in user: load from server and merge (server wins)
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
            localStorage.setItem(key, JSON.stringify(mergedItems));
            setLoading(false);
            return;
          }
        } catch {}
      }

      // Also try reading from old key (pre-suffix) for backward compat
      if (firebaseUid && localItems.length === 0) {
        try {
          const oldKey = CART_KEY + '_' + shopSlug;
          const oldSaved = localStorage.getItem(oldKey);
          if (oldSaved) {
            const oldItems: CartItem[] = JSON.parse(oldSaved);
            if (oldItems.length > 0) {
              setItems(oldItems);
              localStorage.setItem(key, JSON.stringify(oldItems));
              localStorage.removeItem(oldKey);
              localItems = oldItems;
            }
          }
        } catch {}
      }

      setItems(localItems);
      setLoading(false);
    };

    loadCart();
  }, [botId, shopSlug, viewMode]);

  // Save to localStorage on items change (uses keyRef from last load)
  useEffect(() => {
    if (!shopSlug || !keyRef.current) return;
    localStorage.setItem(keyRef.current, JSON.stringify(items));
  }, [items, shopSlug]);

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

  const addItem = useCallback((product: { id: number; name: string; price: number; image_url: string }, colorHex?: string | null) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
        image_url: product.image_url || '',
        selected_color: colorHex || null,
      }];
    });
  }, []);

  const updateQty = useCallback((productId: number, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      const newQty = i.quantity + delta;
      return newQty <= 0 ? null : { ...i, quantity: newQty };
    }).filter(Boolean) as CartItem[]);
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    if (firebaseUid && botId) {
      clearServerCart(botId, firebaseUid);
    }
  }, [firebaseUid, botId]);

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return { items, cartCount, totalAmount, loading, addItem, updateQty, removeItem, clearCart };
}
