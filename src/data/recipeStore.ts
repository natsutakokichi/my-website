import type { Recipe } from "../types";
import { recipes as builtinRecipes } from "./recipes";

const STORAGE_KEY = "meal-planner-custom-recipes";
const OVERRIDES_KEY = "meal-planner-overrides";
const DELETED_KEY = "meal-planner-deleted";

function loadCustomRecipes(): Recipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomRecipes(recipes: Recipe[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

function loadOverrides(): Record<number, Recipe> {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides: Record<number, Recipe>): void {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

function loadDeleted(): number[] {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDeleted(ids: number[]): void {
  localStorage.setItem(DELETED_KEY, JSON.stringify(ids));
}

export function getAllRecipes(): Recipe[] {
  const overrides = loadOverrides();
  const deleted = new Set(loadDeleted());
  const builtin = builtinRecipes
    .filter((r) => !deleted.has(r.id))
    .map((r) => overrides[r.id] ?? r);
  return [...builtin, ...loadCustomRecipes()];
}

export function getCustomRecipes(): Recipe[] {
  return loadCustomRecipes();
}

export function addCustomRecipe(recipe: Omit<Recipe, "id">): Recipe {
  const all = getAllRecipes();
  const maxId = Math.max(
    all.reduce((max, r) => Math.max(max, r.id), 0),
    builtinRecipes.reduce((max, r) => Math.max(max, r.id), 0)
  );
  const newRecipe: Recipe = { ...recipe, id: maxId + 1 };
  const custom = loadCustomRecipes();
  custom.push(newRecipe);
  saveCustomRecipes(custom);
  return newRecipe;
}

export function addCustomRecipes(recipes: Omit<Recipe, "id">[]): Recipe[] {
  const all = getAllRecipes();
  let nextId = Math.max(
    all.reduce((max, r) => Math.max(max, r.id), 0),
    builtinRecipes.reduce((max, r) => Math.max(max, r.id), 0)
  ) + 1;
  const custom = loadCustomRecipes();
  const added: Recipe[] = [];
  for (const recipe of recipes) {
    const newRecipe: Recipe = { ...recipe, id: nextId++ };
    custom.push(newRecipe);
    added.push(newRecipe);
  }
  saveCustomRecipes(custom);
  return added;
}

export function updateRecipe(updated: Recipe): void {
  const isBuiltin = builtinRecipes.some((r) => r.id === updated.id);
  if (isBuiltin) {
    const overrides = loadOverrides();
    overrides[updated.id] = updated;
    saveOverrides(overrides);
  } else {
    const custom = loadCustomRecipes().map((r) =>
      r.id === updated.id ? updated : r
    );
    saveCustomRecipes(custom);
  }
}

export function deleteRecipe(id: number): void {
  const isBuiltin = builtinRecipes.some((r) => r.id === id);
  if (isBuiltin) {
    const deleted = loadDeleted();
    if (!deleted.includes(id)) {
      deleted.push(id);
      saveDeleted(deleted);
    }
    // Also clean up any override
    const overrides = loadOverrides();
    delete overrides[id];
    saveOverrides(overrides);
  } else {
    const custom = loadCustomRecipes().filter((r) => r.id !== id);
    saveCustomRecipes(custom);
  }
}

// Keep old names for backward compat with import logic
export const updateCustomRecipe = updateRecipe;
export const deleteCustomRecipe = deleteRecipe;
