#!/usr/bin/env node

/**
 * レシピスクレイピングスクリプト
 *
 * 使い方:
 *   node scripts/scrape-recipes.js <URL>                       # 単一レシピ
 *   node scripts/scrape-recipes.js --search "鶏肉" --limit 5   # キーワード検索
 *
 * 出力: JSON (stdout)  進捗: stderr
 */

import * as cheerio from "cheerio";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── カテゴリ・メイン食材の推定キーワード ──

const CATEGORY_KEYWORDS = {
  汁物: ["みそ汁", "味噌汁", "スープ", "汁", "ポタージュ", "チャウダー", "豚汁", "けんちん汁", "すまし汁", "お吸い物"],
  副菜: ["サラダ", "和え物", "あえ物", "漬物", "おひたし", "お浸し", "マリネ", "ナムル", "酢の物", "浅漬け"],
};

const MEAT_KEYWORDS = ["鶏", "豚", "牛", "ひき肉", "挽き肉", "ミンチ", "ベーコン", "ハム", "ソーセージ", "鶏肉", "豚肉", "牛肉", "ささみ", "もも肉", "むね肉"];
const FISH_KEYWORDS = ["鮭", "サバ", "さば", "鯖", "まぐろ", "マグロ", "鯛", "たら", "タラ", "鱈", "ぶり", "ブリ", "鰤", "いわし", "イワシ", "鰯", "えび", "エビ", "海老", "いか", "イカ", "烏賊", "たこ", "タコ", "蛸", "あじ", "アジ", "鰺", "さんま", "サンマ", "秋刀魚", "かつお", "カツオ", "鰹", "しらす", "ツナ", "魚"];

function guessCategory(name, ingredients) {
  const text = [name, ...ingredients].join(" ");
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) return cat;
  }
  return "主菜";
}

function guessMainType(name, ingredients) {
  const text = [name, ...ingredients].join(" ");
  const hasMeat = MEAT_KEYWORDS.some((kw) => text.includes(kw));
  const hasFish = FISH_KEYWORDS.some((kw) => text.includes(kw));
  if (hasFish && !hasMeat) return "魚";
  if (hasMeat) return "肉";
  return undefined;
}

const EXCLUDE_INGREDIENTS = ["ご飯", "ごはん", "水", "塩水", "氷水", "熱湯"];

function cleanIngredientName(raw) {
  return raw
    .replace(/^[・•\-\s]+/, "")
    .replace(/\s*[\d０-９]+.*$/, "")
    .replace(/\s*[（(].*[）)]/, "")
    .replace(/\s+(大さじ|小さじ|カップ|合|本|枚|個|片|かけ|切れ|丁|袋|束|把|少々|適量|適宜|お好みで|一つまみ|ひとつまみ|約|茶碗|丼|杯|g|ml|cc|ℓ).*$/, "")
    .trim();
}

// ── JSON-LD パース ──

function extractJsonLd($) {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      const data = JSON.parse($(scripts[i]).html());
      // Handle @graph arrays
      const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      for (const item of items) {
        if (item["@type"] === "Recipe" || (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))) {
          return item;
        }
      }
    } catch {
      // skip invalid JSON-LD
    }
  }
  return null;
}

function parseRecipeFromJsonLd(jsonLd) {
  const name = jsonLd.name || "";

  const rawIngredients = Array.isArray(jsonLd.recipeIngredient)
    ? jsonLd.recipeIngredient
    : [];

  const ingredients = rawIngredients
    .map(cleanIngredientName)
    .filter((s) => s.length > 0 && !EXCLUDE_INGREDIENTS.includes(s));

  const description =
    typeof jsonLd.description === "string" ? jsonLd.description.trim() : "";

  const category = guessCategory(name, ingredients);
  const mainType = category === "主菜" ? guessMainType(name, ingredients) : undefined;

  return {
    name,
    category,
    mainType,
    ingredients,
    description,
  };
}

// ── HTTP fetch ──

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MealPlannerBot/1.0; +https://github.com/example/meal-planner)",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${url}`);
  }
  return await res.text();
}

async function scrapeRecipe(url) {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);
  const jsonLd = extractJsonLd($);
  if (!jsonLd) {
    throw new Error(`JSON-LDのRecipeが見つかりません: ${url}`);
  }
  return parseRecipeFromJsonLd(jsonLd);
}

// ── NHK きょうの料理 検索 ──

async function searchNhkRecipes(keyword, limit) {
  const searchUrl = `https://www.kyounoryouri.jp/search/recipe?keyword=${encodeURIComponent(keyword)}`;
  process.stderr.write(`検索中: ${searchUrl}\n`);

  const html = await fetchPage(searchUrl);
  const $ = cheerio.load(html);

  const urls = [];
  $("a[href*='/recipe/']").each((_, el) => {
    const href = $(el).attr("href");
    if (href && /\/recipe\/\d+/.test(href)) {
      const full = href.startsWith("http")
        ? href
        : `https://www.kyounoryouri.jp${href}`;
      if (!urls.includes(full)) urls.push(full);
    }
  });

  return urls.slice(0, limit);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── recipes.ts への書き込み ──

const __dirname = dirname(fileURLToPath(import.meta.url));
const RECIPES_FILE = resolve(__dirname, "../src/data/recipes.ts");

function getNextId() {
  const src = readFileSync(RECIPES_FILE, "utf-8");
  const ids = [...src.matchAll(/id:\s*(\d+)/g)].map((m) => Number(m[1]));
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

function formatRecipeEntry(recipe, id) {
  const lines = [`  {\n    id: ${id},\n    name: ${JSON.stringify(recipe.name)},\n    category: ${JSON.stringify(recipe.category)},`];
  if (recipe.mainType) {
    lines.push(`    mainType: ${JSON.stringify(recipe.mainType)},`);
  }
  if (recipe.seasonMonths) {
    lines.push(`    seasonMonths: ${JSON.stringify(recipe.seasonMonths)},`);
  }
  lines.push(`    ingredients: ${JSON.stringify(recipe.ingredients)},`);
  lines.push(`    description: ${JSON.stringify(recipe.description)},`);
  lines.push(`  },`);
  return lines.join("\n");
}

function appendToRecipesFile(recipes) {
  let src = readFileSync(RECIPES_FILE, "utf-8");
  let nextId = getNextId();

  const entries = recipes.map((r) => {
    const entry = formatRecipeEntry(r, nextId);
    nextId++;
    return entry;
  });

  // Insert before the closing "];"
  const insertion = "\n" + entries.join("\n") + "\n";
  src = src.replace(/\n\];\s*$/, insertion + "];\n");

  writeFileSync(RECIPES_FILE, src, "utf-8");
}

// ── CLI ──

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    process.stderr.write(
      `使い方:
  node scripts/scrape-recipes.js <URL>                       # 単一レシピ (JSON出力)
  node scripts/scrape-recipes.js --search "鶏肉" --limit 5   # キーワード検索 (JSON出力)
  node scripts/scrape-recipes.js --add <URL> [URL...]         # スクレイプ → recipes.ts に追加
  node scripts/scrape-recipes.js --add --search "鶏肉"        # 検索 → recipes.ts に追加
`
    );
    process.exit(1);
  }

  const addMode = args.includes("--add");
  const searchIdx = args.indexOf("--search");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) || 5 : 5;

  let urls = [];

  if (searchIdx !== -1) {
    const keyword = args[searchIdx + 1];
    if (!keyword) {
      process.stderr.write("--search にキーワードを指定してください\n");
      process.exit(1);
    }
    urls = await searchNhkRecipes(keyword, limit);
    if (urls.length === 0) {
      process.stderr.write("レシピが見つかりませんでした\n");
      process.exit(1);
    }
    process.stderr.write(`${urls.length}件のレシピURLを取得しました\n`);
  } else {
    urls = args.filter((a) => !a.startsWith("--"));
  }

  const recipes = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      process.stderr.write(`[${i + 1}/${urls.length}] ${url}\n`);
      const recipe = await scrapeRecipe(url);
      recipes.push(recipe);
      process.stderr.write(`  → ${recipe.name} (${recipe.category})\n`);
    } catch (err) {
      process.stderr.write(`  エラー: ${err.message}\n`);
    }

    if (i < urls.length - 1) {
      await sleep(500);
    }
  }

  if (recipes.length === 0) {
    process.stderr.write("取得できたレシピが0件でした\n");
    process.exit(1);
  }

  if (addMode) {
    appendToRecipesFile(recipes);
    process.stderr.write(`\n${recipes.length}件を recipes.ts に追加しました\n`);
  } else {
    process.stdout.write(JSON.stringify(recipes, null, 2) + "\n");
    process.stderr.write(`\n完了: ${recipes.length}件のレシピを出力しました\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`エラー: ${err.message}\n`);
  process.exit(1);
});
