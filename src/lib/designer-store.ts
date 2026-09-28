"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  getProduct,
  PRODUCTS,
  type LocationKey,
  type PrintMethod,
  type SizeKey,
  type ViewKey,
} from "./catalog";
import {
  emptyDesignDoc,
  type DesignDoc,
  type DesignObject,
} from "./design";
import { nanoid } from "./id";

export type PanelKey = "producto" | "texto" | "arte" | "subir" | "capas";

interface DesignerState {
  productId: string;
  colorId: string;
  method: PrintMethod;
  rush: boolean;
  objects: DesignObject[];
  quantities: Partial<Record<SizeKey, number>>;

  activeView: ViewKey;
  activeLocation: LocationKey;
  selectedId: string | null;
  panel: PanelKey;

  past: DesignObject[][];
  future: DesignObject[][];

  setProduct: (productId: string) => void;
  setColor: (colorId: string) => void;
  setMethod: (method: PrintMethod) => void;
  setRush: (rush: boolean) => void;
  setQuantity: (size: SizeKey, quantity: number) => void;
  clearQuantities: () => void;

  setActiveView: (view: ViewKey) => void;
  setActiveLocation: (location: LocationKey) => void;
  setPanel: (panel: PanelKey) => void;
  select: (id: string | null) => void;

  addObject: (object: Omit<DesignObject, "id" | "location"> & { location?: LocationKey }) => string;
  updateObject: (id: string, patch: Partial<DesignObject>, options?: { history?: boolean }) => void;
  removeObject: (id: string) => void;
  duplicateObject: (id: string) => void;
  reorder: (id: string, direction: "adelante" | "atras") => void;

  undo: () => void;
  redo: () => void;
  resetDesign: () => void;
  loadDoc: (doc: DesignDoc) => void;
  toDoc: () => DesignDoc;
}

const DEFAULT_PRODUCT = PRODUCTS[0];

/** Ubicación por defecto al cambiar de vista. */
function primaryLocationFor(view: ViewKey): LocationKey {
  return view === "frente" ? "frente" : "espalda";
}

export const useDesigner = create<DesignerState>()(
  persist(
    (set, get) => {
      /** Aplica un cambio sobre los objetos apilando el estado anterior. */
      const commit = (
        updater: (objects: DesignObject[]) => DesignObject[],
        history = true,
      ) => {
        set((state) => {
          const next = updater(state.objects);
          if (next === state.objects) return state;
          return {
            objects: next,
            past: history ? [...state.past, state.objects].slice(-50) : state.past,
            future: history ? [] : state.future,
          };
        });
      };

      return {
        productId: DEFAULT_PRODUCT.id,
        // Negro por defecto: es el más vendido y deja ver la tinta blanca.
        colorId: "negro",
        method: "serigrafia",
        rush: false,
        objects: [],
        quantities: {},

        activeView: "frente",
        activeLocation: "frente",
        selectedId: null,
        panel: "producto",

        past: [],
        future: [],

        setProduct: (productId) => {
          const product = getProduct(productId);
          if (!product) return;
          const state = get();
          const colorStillExists = product.colors.some((c) => c.id === state.colorId);
          set({
            productId,
            colorId: colorStillExists ? state.colorId : product.colors[0].id,
          });
        },

        setColor: (colorId) => set({ colorId }),
        setMethod: (method) => set({ method }),
        setRush: (rush) => set({ rush }),

        setQuantity: (size, quantity) =>
          set((state) => ({
            quantities: {
              ...state.quantities,
              [size]: Math.max(0, Math.min(9999, Math.trunc(quantity) || 0)),
            },
          })),

        clearQuantities: () => set({ quantities: {} }),

        setActiveView: (view) =>
          set((state) => {
            const current = state.activeLocation;
            const product = getProduct(state.productId);
            const locationBelongsToView = product?.locations.find(
              (l) => l.key === current,
            )?.view;
            return {
              activeView: view,
              selectedId: null,
              activeLocation:
                locationBelongsToView === view ? current : primaryLocationFor(view),
            };
          }),

        setActiveLocation: (location) => {
          const product = getProduct(get().productId);
          const view = product?.locations.find((l) => l.key === location)?.view;
          set({
            activeLocation: location,
            ...(view ? { activeView: view } : {}),
            selectedId: null,
          });
        },

        setPanel: (panel) => set({ panel }),
        select: (selectedId) => set({ selectedId }),

        addObject: (object) => {
          const id = nanoid();
          const location = object.location ?? get().activeLocation;
          commit((objects) => [
            ...objects,
            { ...object, id, location } as DesignObject,
          ]);
          set({ selectedId: id });
          return id;
        },

        updateObject: (id, patch, options) =>
          commit(
            (objects) =>
              objects.map((object) =>
                object.id === id ? ({ ...object, ...patch } as DesignObject) : object,
              ),
            options?.history ?? true,
          ),

        removeObject: (id) => {
          commit((objects) => objects.filter((object) => object.id !== id));
          if (get().selectedId === id) set({ selectedId: null });
        },

        duplicateObject: (id) => {
          const original = get().objects.find((object) => object.id === id);
          if (!original) return;
          const copy = {
            ...original,
            id: nanoid(),
            x: original.x + 18,
            y: original.y + 18,
          } as DesignObject;
          commit((objects) => [...objects, copy]);
          set({ selectedId: copy.id });
        },

        reorder: (id, direction) =>
          commit((objects) => {
            const index = objects.findIndex((object) => object.id === id);
            if (index === -1) return objects;
            const target = direction === "adelante" ? index + 1 : index - 1;
            if (target < 0 || target >= objects.length) return objects;
            const next = [...objects];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
          }),

        undo: () =>
          set((state) => {
            const previous = state.past.at(-1);
            if (!previous) return state;
            return {
              objects: previous,
              past: state.past.slice(0, -1),
              future: [state.objects, ...state.future].slice(0, 50),
              selectedId: null,
            };
          }),

        redo: () =>
          set((state) => {
            const [next, ...rest] = state.future;
            if (!next) return state;
            return {
              objects: next,
              past: [...state.past, state.objects],
              future: rest,
              selectedId: null,
            };
          }),

        resetDesign: () =>
          set((state) => ({
            objects: [],
            past: [...state.past, state.objects].slice(-50),
            future: [],
            selectedId: null,
          })),

        loadDoc: (doc) =>
          set({
            productId: doc.productId,
            colorId: doc.colorId,
            method: doc.method,
            rush: doc.rush,
            objects: doc.objects,
            selectedId: null,
            past: [],
            future: [],
          }),

        toDoc: () => {
          const state = get();
          return {
            ...emptyDesignDoc(state.productId, state.colorId, state.method),
            rush: state.rush,
            objects: state.objects,
          };
        },
      };
    },
    {
      name: "soja-designer-v1",
      version: 1,
      // El historial y la selección no se persisten: son estado de sesión.
      partialize: (state) => ({
        productId: state.productId,
        colorId: state.colorId,
        method: state.method,
        rush: state.rush,
        objects: state.objects,
        quantities: state.quantities,
      }),
    },
  ),
);

export function useSelectedObject(): DesignObject | null {
  return useDesigner(
    (state) => state.objects.find((object) => object.id === state.selectedId) ?? null,
  );
}
