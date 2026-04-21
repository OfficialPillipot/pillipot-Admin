import type { Product } from "../types";
import { edenApi } from "./api/edenApi";
import type { NewProductPayload } from "./api/edenApi";
import type { RootState } from "./rootReducer";

export type { NewProductPayload };

const selectProductsResult = edenApi.endpoints.getProducts.select(undefined);

export const selectProducts = (state: RootState) =>
  selectProductsResult(state).data ?? [];

export const selectProductById = (state: RootState, id: string) =>
  (selectProductsResult(state).data ?? []).find((p) => p.id === id);

export const fetchProducts = () =>
  edenApi.endpoints.getProducts.initiate(undefined, { forceRefetch: true });

export const createProduct = (payload: NewProductPayload) =>
  edenApi.endpoints.createProduct.initiate(payload);

export const updateProduct = (arg: {
  id: string;
  patch: Partial<Product> & { image?: File | File[]; video?: File };
}) => edenApi.endpoints.updateProduct.initiate(arg);

export const deleteProduct = (id: string) =>
  edenApi.endpoints.deleteProduct.initiate(id);
