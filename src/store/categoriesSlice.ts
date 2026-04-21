import type { Category } from "../types";
import { edenApi } from "./api/edenApi";
import type { RootState } from "./rootReducer";

const selectCategoriesResult = edenApi.endpoints.getCategories.select(undefined);

export const selectCategories = (state: RootState) =>
  selectCategoriesResult(state).data ?? [];

export const fetchCategories = () =>
  edenApi.endpoints.getCategories.initiate(undefined, { forceRefetch: true });

export const createCategory = (
  payload: Pick<Category, "name"> & { description?: string; image?: File },
) => edenApi.endpoints.createCategory.initiate(payload);

export const updateCategory = (arg: {
  id: string;
  patch: Partial<Pick<Category, "name" | "description" | "imageUrl">> & {
    image?: File | null;
  };
}) => edenApi.endpoints.updateCategory.initiate(arg);

export const deleteCategory = (id: string) =>
  edenApi.endpoints.deleteCategory.initiate(id);
