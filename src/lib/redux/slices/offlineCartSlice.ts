import { SelectedAddon } from "@/types/ApiResponse";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type OfflineCartItem = {
  id: string;
  name: string;
  image?: string;
  slug?: string;
  price: number;
  quantity: number;
  storeName?: string;
  storeSlug?: string;
  minQuantity: number;
  maxQuantity: number;
  stepSize: number;
  store_id: number;
  addons?: SelectedAddon[]; // Add addons
  addonsTotalPrice?: number; // Total price of all selected addons
};

export type OfflineCartState = {
  items: OfflineCartItem[];
  subtotal: number;
  totalQuantity: number;
};

const initialState: OfflineCartState = {
  items: [],
  subtotal: 0,
  totalQuantity: 0,
};

const recalculateSummary = (items: OfflineCartItem[]) => {
  const summary = items.reduce(
    (acc, item) => {
      // Calculate item total (product price + addons price)
      const itemTotal =
        (item.price + (item.addonsTotalPrice || 0)) * item.quantity;
      acc.subtotal += itemTotal;
      acc.totalQuantity += item.quantity;
      return acc;
    },
    { subtotal: 0, totalQuantity: 0 },
  );

  return summary;
};

const clampQuantity = (item: OfflineCartItem, desiredQuantity: number) => {
  const minQuantity = item.minQuantity || 1;
  const stepSize = item.stepSize || 1;
  const maxQuantity = item.maxQuantity || Number.MAX_SAFE_INTEGER;

  let qty = Math.max(minQuantity, Math.min(desiredQuantity, maxQuantity));

  const remainder = (qty - minQuantity) % stepSize;
  if (remainder !== 0) {
    qty = qty - remainder;
    if (qty < minQuantity) {
      qty = minQuantity;
    }
  }

  return qty;
};

const calculateAddonsTotal = (addons?: SelectedAddon[]): number => {
  if (!addons || addons.length === 0) return 0;
  return addons.reduce((total, addon) => total + (addon.price || 0), 0);
};

const normalizeItem = (item: OfflineCartItem) => {
  const normalizedQuantity = clampQuantity(item, item.quantity);
  const addonsTotalPrice = calculateAddonsTotal(item.addons);
  return {
    ...item,
    quantity: normalizedQuantity,
    addonsTotalPrice,
  };
};

const offlineCartSlice = createSlice({
  name: "offlineCart",
  initialState,
  reducers: {
    hydrateOfflineCart: (
      state,
      action: PayloadAction<OfflineCartItem[] | undefined>,
    ) => {
      state.items = (action.payload || []).map((item) => ({
        ...item,
        addonsTotalPrice: calculateAddonsTotal(item.addons),
      }));
      const summary = recalculateSummary(state.items);
      state.subtotal = summary.subtotal;
      state.totalQuantity = summary.totalQuantity;
    },
    setOfflineCart: (state, action: PayloadAction<OfflineCartItem[]>) => {
      state.items = action.payload.map((item) => ({
        ...item,
        addonsTotalPrice: calculateAddonsTotal(item.addons),
      }));
      const summary = recalculateSummary(state.items);
      state.subtotal = summary.subtotal;
      state.totalQuantity = summary.totalQuantity;
    },
    addOfflineCartItem: (state, action: PayloadAction<OfflineCartItem>) => {
      const normalizedPayload = normalizeItem(action.payload);
      const existingIndex = state.items.findIndex(
        (item) => item.id === normalizedPayload.id,
      );

      if (existingIndex >= 0) {
        const existingItem = state.items[existingIndex];
        const mergedItem = {
          ...existingItem,
          ...normalizedPayload,
          // Merge addons if needed (you might want to keep existing addons or replace)
          addons: normalizedPayload.addons || existingItem.addons,
          addonsTotalPrice: calculateAddonsTotal(
            normalizedPayload.addons || existingItem.addons,
          ),
        };
        mergedItem.quantity = clampQuantity(
          mergedItem,
          existingItem.quantity + normalizedPayload.quantity,
        );
        state.items[existingIndex] = mergedItem;
      } else {
        state.items.push(normalizedPayload);
      }

      const summary = recalculateSummary(state.items);
      state.subtotal = summary.subtotal;
      state.totalQuantity = summary.totalQuantity;
    },
    updateOfflineCartItemQuantity: (
      state,
      action: PayloadAction<{ id: string; quantity: number }>,
    ) => {
      const targetItem = state.items.find(
        (item) => item.id === action.payload.id,
      );

      if (targetItem) {
        targetItem.quantity = clampQuantity(
          targetItem,
          action.payload.quantity,
        );
        const summary = recalculateSummary(state.items);
        state.subtotal = summary.subtotal;
        state.totalQuantity = summary.totalQuantity;
      }
    },
    removeOfflineCartItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      const summary = recalculateSummary(state.items);
      state.subtotal = summary.subtotal;
      state.totalQuantity = summary.totalQuantity;
    },
    clearOfflineCart: (state) => {
      state.items = [];
      state.subtotal = 0;
      state.totalQuantity = 0;
    },
  },
});

export const {
  hydrateOfflineCart,
  setOfflineCart,
  addOfflineCartItem,
  updateOfflineCartItemQuantity,
  removeOfflineCartItem,
  clearOfflineCart,
} = offlineCartSlice.actions;

export default offlineCartSlice.reducer;
