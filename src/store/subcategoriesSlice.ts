import type { Subcategory } from "../types";
import { edenApi } from "./api/edenApi";
import type { RootState } from "./rootReducer";

const selectSubcategoriesResult = edenApi.endpoints.getSubcategories.select(undefined);

export const selectSubcategories = (state: RootState) =>
  selectSubcategoriesResult(state).data ?? [];

export const fetchSubcategories = () =>
  edenApi.endpoints.getSubcategories.initiate(undefined, { forceRefetch: true });

export const createSubcategory = (
  payload: Pick<Subcategory, "name" | "categoryId"> & { description?: string },
) => edenApi.endpoints.createSubcategory.initiate(payload);

export const updateSubcategory = (arg: {
  id: string;
  patch: Partial<Pick<Subcategory, "name" | "description" | "categoryId">>;
}) => edenApi.endpoints.updateSubcategory.initiate(arg);

export const deleteSubcategory = (id: string) =>
  edenApi.endpoints.deleteSubcategory.initiate(id);
