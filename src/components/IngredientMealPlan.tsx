import { useState } from "react";
import type { MealPlan } from "../types";
import { generateMealPlansByIngredients } from "../utils/mealPlanner";
import { RecipeCard } from "./RecipeCard";
import styles from "./IngredientMealPlan.module.css";

export function IngredientMealPlan() {
  const [input, setInput] = useState("");
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [noMatch, setNoMatch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    const ingredients = input
      .split(/[,、\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (ingredients.length === 0) return;

    const results = generateMealPlansByIngredients(ingredients, 3);
    setPlans(results);
    setNoMatch(results.length === 0);
    setSearchQuery(ingredients.join(" "));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const webSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery + " レシピ")}`;

  return (
    <div className={styles.container}>
      <p className={styles.description}>
        使いたい食材を入力すると、その食材を使った献立を提案します。
        <br />
        <span className={styles.hint}>
          複数の食材はカンマ（、）やスペースで区切ってください
        </span>
      </p>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          type="text"
          placeholder="例: 豚肉、豆腐、ほうれん草"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className={styles.button} onClick={handleSearch}>
          検索
        </button>
      </div>
      {noMatch && (
        <div className={styles.noMatch}>
          <p className={styles.noMatchText}>
            この食材を使用したレシピはありません
          </p>
          <a
            className={styles.webSearchLink}
            href={webSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            ウェブで「{searchQuery} レシピ」を検索する →
          </a>
        </div>
      )}
      {plans.length > 0 && (
        <div className={styles.candidates}>
          {plans.map((plan, i) => (
            <div key={i} className={styles.candidateBlock}>
              <h3 className={styles.candidateLabel}>候補 {i + 1}</h3>
              <div className={styles.planGrid}>
                <RecipeCard recipe={plan.main} showDetails />
                <RecipeCard recipe={plan.side} showDetails />
                <RecipeCard recipe={plan.soup} showDetails />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
