import { useState, useMemo, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Loader2, GripVertical, Tag, Package, Edit2 } from 'lucide-react';
import { updateProductSortOrder, updateCategory, getImageUrl } from '../api/products';
import { useToastStore } from '../store/toastStore';

function SortableItem({ product, botId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(product.id),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-white rounded-xl border ${isDragging ? 'border-indigo-400 shadow-lg ring-2 ring-indigo-200' : 'border-gray-100'} transition-shadow`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        title="Drag to reorder"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      <div className="w-12 h-12 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100">
        {product.image_url ? (
          <img
            src={getImageUrl(product.image_url, botId)}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div
          className="w-full h-full items-center justify-center text-gray-300"
          style={{ display: product.image_url ? 'none' : 'flex' }}
        >
          <Package className="w-5 h-5" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
        <p className="text-xs text-indigo-600 font-bold">{Number(product.price).toLocaleString()} MMK</p>
      </div>
      {product.sort_order != null && (
        <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full">
          #{product.sort_order + 1}
        </span>
      )}
    </div>
  );
}

export default function ProductSorting({ products, categories, botId, onClose }) {
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();

  // Build category map
  const categoryMap = useMemo(() => {
    const map = {};
    categories?.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  // Group products by category
  const groupedByCategory = useMemo(() => {
    const groups = {};
    products.forEach(p => {
      const catId = p.category_id || '__uncategorized__';
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(p);
    });

    // Sort within each group: sort_order ASC (non-null first), then created_at DESC
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order;
        if (a.sort_order != null) return -1;
        if (b.sort_order != null) return 1;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
    });

    return groups;
  }, [products]);

  // All category keys in display order
  const categoryKeys = useMemo(() => {
    const keys = Object.keys(groupedByCategory);

    // Sort: categories (by name) first, then uncategorized
    const realCats = keys.filter(k => k !== '__uncategorized__').sort((a, b) => {
      const nameA = (categoryMap[a] || '').toLowerCase();
      const nameB = (categoryMap[b] || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    if (keys.includes('__uncategorized__')) realCats.push('__uncategorized__');
    return realCats;
  }, [groupedByCategory, categoryMap]);

  // Display tabs: All + individual categories
  const displayKeys = useMemo(() => ['__all__', ...categoryKeys], [categoryKeys]);

  const [selectedCategory, setSelectedCategory] = useState('__all__');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Build full product list (for All tab) sorted globally
  const allProductsOrdered = useMemo(() => {
    const all = [];
    categoryKeys.forEach(key => {
      (groupedByCategory[key] || []).forEach(p => all.push(p));
    });
    return all;
  }, [groupedByCategory, categoryKeys]);

  // Flat product lookup by id (for All tab)
  const productMap = useMemo(() => {
    const map = {};
    products.forEach(p => { map[String(p.id)] = p; });
    return map;
  }, [products]);

  // Local ordered items state per category
  const [orderedIds, setOrderedIds] = useState(() => {
    const map = {};
    // All tab: combine all products in global sort order
    map.__all__ = allProductsOrdered.map(p => String(p.id));
    categoryKeys.forEach(key => {
      map[key] = (groupedByCategory[key] || []).map(p => String(p.id));
    });
    return map;
  });

  // Sync orderedIds when products data changes (initial load)
  useEffect(() => {
    const map = {};
    map.__all__ = allProductsOrdered.map(p => String(p.id));
    categoryKeys.forEach(key => {
      map[key] = (groupedByCategory[key] || []).map(p => String(p.id));
    });
    setOrderedIds(map);
  }, [groupedByCategory, categoryKeys, allProductsOrdered]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedCategory) return;

    setOrderedIds(prev => {
      const items = [...(prev[selectedCategory] || [])];
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const newItems = arrayMove(items, oldIndex, newIndex);

      if (selectedCategory === '__all__') {
        // Sync "All" reorder back to per-category arrays
        const synced = { ...prev, __all__: newItems };
        // Rebuild per-category arrays from the new global order
        const catMap = {};
        newItems.forEach(id => {
          const p = productMap[id];
          if (p) {
            const catKey = p.category_id || '__uncategorized__';
            if (!catMap[catKey]) catMap[catKey] = [];
            catMap[catKey].push(id);
          }
        });
        categoryKeys.forEach(key => {
          synced[key] = catMap[key] || [];
        });
        return synced;
      }

      return { ...prev, [selectedCategory]: newItems };
    });
  }, [selectedCategory, categoryKeys, productMap]);

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => updateCategory(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', botId] });
      setEditingCategory(null);
      setEditValue('');
    },
    onError: () => {
      addToast('Failed to rename category', 'error');
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (selectedCategory === '__all__') {
        // Save global order from "All" tab
        const allIds = orderedIds.__all__ || [];
        const items = allIds.map((id, idx) => ({
          product_id: Number(id),
          sort_order: idx,
        }));
        return updateProductSortOrder(Number(botId), items);
      }
      // Save per-category order: flatten all categories in order
      const allItems = [];
      categoryKeys.forEach(key => {
        const ids = orderedIds[key] || [];
        ids.forEach((id) => {
          allItems.push({ product_id: Number(id), sort_order: allItems.length });
        });
      });
      return updateProductSortOrder(Number(botId), allItems);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', botId] });
      addToast('Product order saved successfully');
      onClose();
    },
    onError: () => {
      addToast('Failed to save product order', 'error');
    },
  });

  const hasCustomOrder = useMemo(() => {
    return products.some(p => p.sort_order != null);
  }, [products]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-0 md:pt-8 overflow-hidden">
      <div className="bg-white w-full h-full md:max-w-2xl md:h-auto md:max-h-[85vh] md:rounded-3xl md:shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-900 truncate">Product Sorting</h2>
            <p className="text-[11px] text-gray-500">Drag ≡ to reorder products</p>
          </div>
          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
            {hasCustomOrder && (
              <button
                onClick={() => {
                  updateProductSortOrder(Number(botId), []).then(() => {
                    queryClient.invalidateQueries({ queryKey: ['products', botId] });
                    addToast('Product order reset to default');
                    onClose();
                  }).catch(() => {
                    addToast('Failed to reset product order', 'error');
                  });
                }}
                disabled={saveMutation.isPending}
                className="px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-all whitespace-nowrap"
              >
                Reset
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-all text-[11px] whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-1 text-[11px] shadow-sm whitespace-nowrap"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              )}
              Save
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-all flex-shrink-0"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 px-5 py-3 overflow-x-auto border-b border-gray-100 flex-shrink-0 scrollbar-thin">
          {displayKeys.map(key => {
            const isAll = key === '__all__';
            const isUncategorized = key === '__uncategorized__';
            const label = isAll ? 'All' : isUncategorized ? 'Uncategorized' : (categoryMap[key] || 'Unknown');
            const count = isAll
              ? Object.values(groupedByCategory).reduce((s, arr) => s + arr.length, 0)
              : (groupedByCategory[key] || []).length;
            return (
              <button
                key={key}
                onClick={() => {
                  if (editingCategory === key) return;
                  setSelectedCategory(key);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedCategory === key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {!isAll && !isUncategorized && <Tag className="w-3.5 h-3.5" />}
                {editingCategory === key ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => {
                      if (editValue.trim() && editValue.trim() !== label) {
                        renameMutation.mutate({ id: Number(key), name: editValue.trim() });
                      } else {
                        setEditingCategory(null);
                        setEditValue('');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.target.blur();
                      } else if (e.key === 'Escape') {
                        setEditingCategory(null);
                        setEditValue('');
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-24 bg-transparent outline-none border-b ${
                      selectedCategory === key ? 'border-white/50 text-white' : 'border-gray-300 text-gray-900'
                    }`}
                  />
                ) : (
                  <span>{label}</span>
                )}
                {!isAll && !isUncategorized && editingCategory !== key && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCategory(key);
                      setEditValue(label);
                    }}
                    className="p-0.5 opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  selectedCategory === key
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sortable List */}
        <div className="flex-1 overflow-y-auto p-5">
          {selectedCategory && orderedIds[selectedCategory]?.length > 0 ? (
            <div className="space-y-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedIds[selectedCategory] || []}
                  strategy={verticalListSortingStrategy}
                >
                  {(orderedIds[selectedCategory] || []).map(id => {
                    const product = productMap[id];
                    if (!product) return null;
                    return <SortableItem key={id} product={product} botId={botId} />;
                  })}
                </SortableContext>
              </DndContext>
            </div>
          ) : selectedCategory ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm font-bold text-gray-400">No products in this category</p>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}
