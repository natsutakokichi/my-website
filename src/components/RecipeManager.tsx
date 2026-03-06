import { useState, useCallback } from "react";
import type { Category, MainType, Recipe } from "../types";
import {
  getCustomRecipes,
  addCustomRecipe,
  updateCustomRecipe,
  deleteCustomRecipe,
} from "../data/recipeStore";
import styles from "./RecipeManager.module.css";

const categoryBadgeColor: Record<string, { bg: string; color: string }> = {
  主菜: { bg: "rgba(255, 107, 107, 0.12)", color: "#ff6b6b" },
  副菜: { bg: "rgba(81, 207, 102, 0.12)", color: "#51cf66" },
  汁物: { bg: "rgba(51, 154, 240, 0.12)", color: "#339af0" },
};

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const MONTH_LABELS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

function formatSeasonMonths(months?: number[]): string {
  if (!months || months.length === 0) return "通年";
  return months.map((m) => `${m}月`).join(", ");
}

export function RecipeManager() {
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>(getCustomRecipes);
  const [visibleCount, setVisibleCount] = useState(10);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("主菜");
  const [mainType, setMainType] = useState<MainType>("肉");
  const [ingredientsText, setIngredientsText] = useState("");
  const [description, setDescription] = useState("");
  const [useSeason, setUseSeason] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());

  const refresh = useCallback(() => {
    setCustomRecipes(getCustomRecipes());
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCategory("主菜");
    setMainType("肉");
    setIngredientsText("");
    setDescription("");
    setUseSeason(false);
    setSelectedMonths(new Set());
  };

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  const buildRecipeFields = () => {
    const ingredients = ingredientsText
      .split(/[,、\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const seasonMonths =
      useSeason && selectedMonths.size > 0
        ? [...selectedMonths].sort((a, b) => a - b)
        : undefined;
    return {
      name: name.trim(),
      category,
      mainType: category === "主菜" ? mainType : undefined,
      seasonMonths,
      ingredients,
      description: description.trim(),
    };
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const fields = buildRecipeFields();

    if (editingId !== null) {
      updateCustomRecipe({ ...fields, id: editingId });
    } else {
      addCustomRecipe(fields);
    }
    resetForm();
    refresh();
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setName(recipe.name);
    setCategory(recipe.category);
    setMainType(recipe.mainType ?? "肉");
    setIngredientsText(recipe.ingredients.join("、"));
    setDescription(recipe.description);
    if (recipe.seasonMonths && recipe.seasonMonths.length > 0) {
      setUseSeason(true);
      setSelectedMonths(new Set(recipe.seasonMonths));
    } else {
      setUseSeason(false);
      setSelectedMonths(new Set());
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  const handleDelete = (id: number) => {
    deleteCustomRecipe(id);
    if (editingId === id) resetForm();
    refresh();
  };

  return (
    <div className={styles.container}>
      <section className={styles.form}>
        <h3 className={styles.sectionTitle}>
          {editingId !== null ? "レシピを編集" : "レシピを登録"}
        </h3>
        <div className={styles.field}>
          <label className={styles.label}>レシピ名</label>
          <input
            className={styles.input}
            type="text"
            placeholder="例: 鶏肉のトマト煮"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>カテゴリ</label>
            <select
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              <option value="主菜">主菜</option>
              <option value="副菜">副菜</option>
              <option value="汁物">汁物</option>
            </select>
          </div>
          {category === "主菜" && (
            <div className={styles.field}>
              <label className={styles.label}>メイン食材</label>
              <select
                className={styles.select}
                value={mainType}
                onChange={(e) => setMainType(e.target.value as MainType)}
              >
                <option value="肉">肉</option>
                <option value="魚">魚</option>
              </select>
            </div>
          )}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>食材（カンマ区切り）</label>
          <input
            className={styles.input}
            type="text"
            placeholder="例: 鶏もも肉、トマト缶、玉ねぎ"
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>説明（任意）</label>
          <input
            className={styles.input}
            type="text"
            placeholder="例: トマトの酸味が効いた洋風おかず"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.seasonToggle}>
            <input
              type="checkbox"
              checked={useSeason}
              onChange={(e) => setUseSeason(e.target.checked)}
            />
            <span>旬の時期を設定する（任意）</span>
          </label>
          {useSeason && (
            <div className={styles.monthGrid}>
              {ALL_MONTHS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`${styles.monthButton} ${selectedMonths.has(m) ? styles.monthActive : ""}`}
                  onClick={() => toggleMonth(m)}
                >
                  {MONTH_LABELS[m - 1]}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={styles.formActions}>
          <button
            className={styles.addButton}
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {editingId !== null ? "更新する" : "登録する"}
          </button>
          {editingId !== null && (
            <button className={styles.cancelButton} onClick={handleCancel}>
              キャンセル
            </button>
          )}
        </div>
      </section>

      {customRecipes.length > 0 && (
        <section className={styles.list}>
          <h3 className={styles.sectionTitle}>
            登録済みレシピ
            <span className={styles.listCount}>{customRecipes.length}件</span>
          </h3>
          {customRecipes.slice(0, visibleCount).map((r) => (
            <div
              key={r.id}
              className={`${styles.listItem} ${editingId === r.id ? styles.listItemEditing : ""}`}
            >
              <div className={styles.listInfo}>
                <span
                  className={styles.listCategory}
                  style={{
                    background: categoryBadgeColor[r.category]?.bg,
                    color: categoryBadgeColor[r.category]?.color,
                  }}
                >{r.category}</span>
                {r.mainType && (
                  <span className={styles.listMainType}>{r.mainType}</span>
                )}
                <span className={styles.listName}>{r.name}</span>
                <span className={styles.listSeason}>
                  {formatSeasonMonths(r.seasonMonths)}
                </span>
              </div>
              <div className={styles.listActions}>
                <button
                  className={styles.editButton}
                  onClick={() => handleEdit(r)}
                >
                  編集
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(r.id)}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
          {visibleCount < customRecipes.length && (
            <button
              className={styles.loadMoreButton}
              onClick={() => setVisibleCount((v) => v + 10)}
            >
              次へ（残り{customRecipes.length - visibleCount}件）
            </button>
          )}
        </section>
      )}
    </div>
  );
}
