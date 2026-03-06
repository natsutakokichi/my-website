import type { Recipe } from "../types";
import { recipes as builtinRecipes } from "./recipes";

const STORAGE_KEY = "meal-planner-custom-recipes";

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

export function getAllRecipes(): Recipe[] {
  return [...builtinRecipes, ...loadCustomRecipes()];
}

export function getCustomRecipes(): Recipe[] {
  return loadCustomRecipes();
}

export function addCustomRecipe(recipe: Omit<Recipe, "id">): Recipe {
  const all = getAllRecipes();
  const maxId = all.reduce((max, r) => Math.max(max, r.id), 0);
  const newRecipe: Recipe = { ...recipe, id: maxId + 1 };
  const custom = loadCustomRecipes();
  custom.push(newRecipe);
  saveCustomRecipes(custom);
  return newRecipe;
}

export function updateCustomRecipe(updated: Recipe): void {
  const custom = loadCustomRecipes().map((r) =>
    r.id === updated.id ? updated : r
  );
  saveCustomRecipes(custom);
}

export function deleteCustomRecipe(id: number): void {
  const custom = loadCustomRecipes().filter((r) => r.id !== id);
  saveCustomRecipes(custom);
}
