import type { Recipe, MealPlan, WeeklyMealPlan, MainType } from "../types";
import { getAllRecipes } from "../data/recipeStore";
import { getLikedIds } from "../data/likeStore";
import { expandSynonyms } from "./synonyms";

const LIKE_WEIGHT = 1.5;

function weightedRandom(arr: Recipe[], likedIds: Set<number>): Recipe {
  const weights = arr.map((r) => (likedIds.has(r.id) ? LIKE_WEIGHT : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function pickNUniqueWeighted(
  arr: Recipe[],
  n: number,
  likedIds: Set<number>
): Recipe[] {
  const pool = [...arr];
  const result: Recipe[] = [];
  while (result.length < n && pool.length > 0) {
    const pick = weightedRandom(pool, likedIds);
    result.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  return result;
}

const DAY_LABELS = ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日", "日曜日"];

function isInSeason(recipe: Recipe): boolean {
  if (!recipe.seasonMonths) return true;
  const currentMonth = new Date().getMonth() + 1;
  return recipe.seasonMonths.includes(currentMonth);
}

export function generateWeeklyMealPlan(
  drinkingDays: boolean[]
): WeeklyMealPlan {
  const recipes = getAllRecipes();
  const likedIds = getLikedIds();

  const meatMains = recipes.filter(
    (r) => r.category === "主菜" && r.mainType === "肉"
  );
  const fishMains = recipes.filter(
    (r) => r.category === "主菜" && r.mainType === "魚" && isInSeason(r)
  );
  const meatMainsNonRice = meatMains.filter((r) => !r.isRiceDish);
  const fishMainsNonRice = fishMains.filter((r) => !r.isRiceDish);

  const sideDishes = recipes.filter((r) => r.category === "副菜");
  const soups = recipes.filter((r) => r.category === "汁物");

  const drinkingCount = drinkingDays.filter(Boolean).length;
  const normalCount = 7 - drinkingCount;

  // 副菜: 通常日7 + 飲酒日は2品ずつ
  const totalSides = normalCount + drinkingCount * 2;
  const selectedSides = pickNUniqueWeighted(sideDishes, totalSides, likedIds);
  const selectedSoups = pickNUniqueWeighted(soups, normalCount, likedIds);

  // 主菜: 肉魚交互
  const startWithMeat = Math.random() < 0.5;
  const meatCount = startWithMeat ? 4 : 3;
  const fishCount = 7 - meatCount;

  // 飲酒日にはご飯物を除外して選ぶ
  const drinkingMeatNeeded = drinkingDays.filter(
    (d, i) => d && ((startWithMeat && i % 2 === 0) || (!startWithMeat && i % 2 === 1))
  ).length;
  const drinkingFishNeeded = drinkingDays.filter(
    (d, i) => d && ((startWithMeat && i % 2 === 1) || (!startWithMeat && i % 2 === 0))
  ).length;

  // 飲酒日用（ご飯物除外）と通常日用を分けて選出
  const drinkMeat = pickNUniqueWeighted(meatMainsNonRice, drinkingMeatNeeded, likedIds);
  const drinkFish = pickNUniqueWeighted(fishMainsNonRice, drinkingFishNeeded, likedIds);

  const usedMeatIds = new Set(drinkMeat.map((r) => r.id));
  const usedFishIds = new Set(drinkFish.map((r) => r.id));

  const normalMeatPool = meatMains.filter((r) => !usedMeatIds.has(r.id));
  const normalFishPool = fishMains.filter((r) => !usedFishIds.has(r.id));

  const normalMeat = pickNUniqueWeighted(
    normalMeatPool.length > 0 ? normalMeatPool : meatMains,
    meatCount - drinkingMeatNeeded,
    likedIds
  );
  const normalFish = pickNUniqueWeighted(
    normalFishPool.length > 0 ? normalFishPool : fishMains,
    fishCount - drinkingFishNeeded,
    likedIds
  );

  // 曜日ごとに組み立て
  let dmi = 0, dfi = 0, nmi = 0, nfi = 0;
  let sideIdx = 0, soupIdx = 0;
  let nextType: MainType = startWithMeat ? "肉" : "魚";

  const days = DAY_LABELS.map((label, i) => {
    const drinking = drinkingDays[i] ?? false;

    // 主菜選出
    let main: Recipe;
    if (drinking) {
      if (nextType === "肉" && dmi < drinkMeat.length) {
        main = drinkMeat[dmi++];
      } else if (nextType === "魚" && dfi < drinkFish.length) {
        main = drinkFish[dfi++];
      } else if (dmi < drinkMeat.length) {
        main = drinkMeat[dmi++];
      } else if (dfi < drinkFish.length) {
        main = drinkFish[dfi++];
      } else {
        main = weightedRandom(
          nextType === "肉" ? meatMainsNonRice : fishMainsNonRice,
          likedIds
        );
      }
    } else {
      if (nextType === "肉" && nmi < normalMeat.length) {
        main = normalMeat[nmi++];
      } else if (nextType === "魚" && nfi < normalFish.length) {
        main = normalFish[nfi++];
      } else if (nmi < normalMeat.length) {
        main = normalMeat[nmi++];
      } else if (nfi < normalFish.length) {
        main = normalFish[nfi++];
      } else {
        main = weightedRandom(
          nextType === "肉" ? meatMains : fishMains,
          likedIds
        );
      }
    }
    nextType = nextType === "肉" ? "魚" : "肉";

    const side = selectedSides[sideIdx++];
    const plan: MealPlan = { main, side };

    if (drinking) {
      plan.side2 = selectedSides[sideIdx++];
    } else {
      plan.soup = selectedSoups[soupIdx++];
    }

    return { label, drinking, plan };
  });

  return { days };
}

// --- 食材検索 ---

function scoreByIngredients(recipe: Recipe, ingredients: string[]): number {
  const expanded = ingredients.flatMap(expandSynonyms);
  return recipe.ingredients.filter((ri) =>
    expanded.some((syn) => ri.includes(syn) || syn.includes(ri))
  ).length;
}

function pickMatched(
  candidates: Recipe[],
  ingredients: string[],
  likedIds: Set<number>
): Recipe | null {
  const scored = candidates
    .map((r) => ({
      recipe: r,
      score: scoreByIngredients(r, ingredients) * (likedIds.has(r.id) ? LIKE_WEIGHT : 1),
    }))
    .filter((s) => s.score > 0);

  if (scored.length === 0) return null;

  const total = scored.reduce((a, s) => a + s.score, 0);
  let rand = Math.random() * total;
  for (const s of scored) {
    rand -= s.score;
    if (rand <= 0) return s.recipe;
  }
  return scored[scored.length - 1].recipe;
}

export function generateMealPlansByIngredients(
  ingredients: string[],
  count: number = 3
): MealPlan[] {
  const recipes = getAllRecipes();
  const likedIds = getLikedIds();
  const allMains = recipes.filter((r) => r.category === "主菜" && isInSeason(r));
  const sideDishes = recipes.filter((r) => r.category === "副菜");
  const soups = recipes.filter((r) => r.category === "汁物");

  const trimmed = ingredients
    .map((i) => i.trim())
    .filter((i) => i.length > 0);

  if (trimmed.length === 0) return [];

  const results: MealPlan[] = [];
  const usedMainIds = new Set<number>();
  const usedSideIds = new Set<number>();
  const usedSoupIds = new Set<number>();

  for (let i = 0; i < count; i++) {
    const availableMains = allMains.filter((r) => !usedMainIds.has(r.id));
    const availableSides = sideDishes.filter((r) => !usedSideIds.has(r.id));
    const availableSoups = soups.filter((r) => !usedSoupIds.has(r.id));

    const main = pickMatched(availableMains, trimmed, likedIds);
    const side = pickMatched(availableSides, trimmed, likedIds);
    const soup = pickMatched(availableSoups, trimmed, likedIds);

    if (!main && !side && !soup) break;

    results.push({
      main: main ?? pickMatched(allMains, trimmed, likedIds) ?? weightedRandom(allMains, likedIds),
      side: side ?? pickMatched(sideDishes, trimmed, likedIds) ?? weightedRandom(sideDishes, likedIds),
      soup: soup ?? pickMatched(soups, trimmed, likedIds) ?? weightedRandom(soups, likedIds),
    });

    if (main) usedMainIds.add(main.id);
    if (side) usedSideIds.add(side.id);
    if (soup) usedSoupIds.add(soup.id);
  }

  return results;
}
