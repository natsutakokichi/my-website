import type { Category, MainType, Recipe } from "../types";

type RecipeInput = Omit<Recipe, "id">;

const VALID_CATEGORIES: Category[] = ["主菜", "副菜", "汁物"];
const VALID_MAIN_TYPES: MainType[] = ["肉", "魚"];

function isValidCategory(v: string): v is Category {
  return (VALID_CATEGORIES as string[]).includes(v);
}

function isValidMainType(v: string): v is MainType {
  return (VALID_MAIN_TYPES as string[]).includes(v);
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parseSeasonMonths(value: string): number[] | undefined {
  if (!value.trim()) return undefined;
  const months = value
    .split(/[,、\s]+/)
    .map((s) => parseInt(s.replace(/月/, ""), 10))
    .filter((n) => !isNaN(n) && n >= 1 && n <= 12);
  return months.length > 0 ? months : undefined;
}

export function parseCSV(text: string): RecipeInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error("CSVにはヘッダー行とデータ行が必要です");
  }

  // Skip header row
  const results: RecipeInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 4) continue;

    const [name, rawCategory, rawMainType, rawIngredients, description, rawSeason] = fields;
    if (!name?.trim()) continue;

    const category: Category = isValidCategory(rawCategory?.trim())
      ? (rawCategory.trim() as Category)
      : "主菜";

    const mainType: MainType | undefined =
      category === "主菜" && rawMainType?.trim()
        ? isValidMainType(rawMainType.trim())
          ? (rawMainType.trim() as MainType)
          : undefined
        : undefined;

    const ingredients = (rawIngredients || "")
      .split(/[,、]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const seasonMonths = parseSeasonMonths(rawSeason || "");

    results.push({
      name: name.trim(),
      category,
      mainType,
      ingredients,
      description: description?.trim() || "",
      seasonMonths,
    });
  }

  if (results.length === 0) {
    throw new Error("インポート可能なレシピが見つかりませんでした");
  }

  return results;
}

interface JSONRecipeInput {
  name?: string;
  category?: string;
  mainType?: string;
  ingredients?: string[];
  description?: string;
  seasonMonths?: number[];
}

export function parseJSON(text: string): RecipeInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSONの形式が正しくありません");
  }

  const items: JSONRecipeInput[] = Array.isArray(parsed) ? parsed : [parsed];

  const results: RecipeInput[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object" || !("name" in item)) continue;
    const obj = item as JSONRecipeInput;
    if (!obj.name?.trim()) continue;

    const category: Category = isValidCategory(obj.category || "")
      ? (obj.category as Category)
      : "主菜";

    const mainType: MainType | undefined =
      category === "主菜" && obj.mainType
        ? isValidMainType(obj.mainType)
          ? (obj.mainType as MainType)
          : undefined
        : undefined;

    const ingredients = Array.isArray(obj.ingredients)
      ? obj.ingredients.map((s) => String(s).trim()).filter((s) => s.length > 0)
      : [];

    const seasonMonths =
      Array.isArray(obj.seasonMonths) &&
      obj.seasonMonths.every((n) => typeof n === "number" && n >= 1 && n <= 12)
        ? obj.seasonMonths
        : undefined;

    results.push({
      name: obj.name.trim(),
      category,
      mainType,
      ingredients,
      description: obj.description?.trim() || "",
      seasonMonths,
    });
  }

  if (results.length === 0) {
    throw new Error("インポート可能なレシピが見つかりませんでした");
  }

  return results;
}
