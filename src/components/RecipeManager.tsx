import { useState, useCallback, useRef, useMemo } from "react";
import type { Category, MainType, Recipe } from "../types";
import {
  getAllRecipes,
  addCustomRecipe,
  addCustomRecipes,
  updateRecipe,
  deleteRecipe,
} from "../data/recipeStore";
import { parseCSV, parseJSON } from "../utils/importParser";
import { EditModal } from "./EditModal";
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

const CATEGORY_ORDER: Record<string, number> = { "主菜": 0, "副菜": 1, "汁物": 2 };
const MAIN_TYPE_ORDER: Record<string, number> = { "肉": 0, "魚": 1 };

function sortRecipes(recipes: Recipe[]): Recipe[] {
  return [...recipes].sort((a, b) => {
    const catA = CATEGORY_ORDER[a.category] ?? 9;
    const catB = CATEGORY_ORDER[b.category] ?? 9;
    if (catA !== catB) return catA - catB;
    const mtA = MAIN_TYPE_ORDER[a.mainType ?? ""] ?? 9;
    const mtB = MAIN_TYPE_ORDER[b.mainType ?? ""] ?? 9;
    if (mtA !== mtB) return mtA - mtB;
    return a.name.localeCompare(b.name, "ja");
  });
}

function formatSeasonMonths(months?: number[]): string {
  if (!months || months.length === 0) return "通年";
  return months.map((m) => `${m}月`).join(", ");
}

export function RecipeManager() {
  const [allRecipes, setAllRecipes] = useState<Recipe[]>(getAllRecipes);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("主菜");
  const [mainType, setMainType] = useState<MainType>("肉");
  const [ingredientsText, setIngredientsText] = useState("");
  const [description, setDescription] = useState("");
  const [useSeason, setUseSeason] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());
  const [importPreview, setImportPreview] = useState<Omit<Recipe, "id">[]>([]);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setAllRecipes(getAllRecipes());
  }, []);

  const sortedRecipes = useMemo(() => sortRecipes(allRecipes), [allRecipes]);

  const resetForm = () => {
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

  const handleSubmit = () => {
    if (!name.trim()) return;
    const ingredients = ingredientsText
      .split(/[,、\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const seasonMonths =
      useSeason && selectedMonths.size > 0
        ? [...selectedMonths].sort((a, b) => a - b)
        : undefined;
    addCustomRecipe({
      name: name.trim(),
      category,
      mainType: category === "主菜" ? mainType : undefined,
      seasonMonths,
      ingredients,
      description: description.trim(),
    });
    resetForm();
    refresh();
  };

  const handleEditSave = (updated: Recipe) => {
    updateRecipe(updated);
    refresh();
    setEditingRecipe(null);
  };

  const handleDelete = (id: number) => {
    deleteRecipe(id);
    refresh();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const recipes = file.name.endsWith(".csv")
          ? parseCSV(text)
          : parseJSON(text);
        setImportPreview(recipes);
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : "ファイルの読み込みに失敗しました"
        );
        setImportPreview([]);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportConfirm = () => {
    if (importPreview.length === 0) return;
    addCustomRecipes(importPreview);
    setImportPreview([]);
    setImportError("");
    refresh();
  };

  const handleImportCancel = () => {
    setImportPreview([]);
    setImportError("");
  };

  const handleExport = () => {
    const all = getAllRecipes();
    const json = JSON.stringify(all, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recipes.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <section className={styles.form}>
        <h3 className={styles.sectionTitle}>レシピを登録</h3>
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
            登録する
          </button>
        </div>
      </section>

      <section className={styles.importSection}>
        <h3 className={styles.sectionTitle}>インポート / エクスポート</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
        <div className={styles.importActions}>
          <button
            className={styles.importButton}
            onClick={() => fileInputRef.current?.click()}
          >
            ファイルを選択（CSV / JSON）
          </button>
          <button
            className={styles.exportButton}
            onClick={handleExport}
          >
            エクスポート（JSON）
          </button>
        </div>
        {importError && (
          <p className={styles.importError}>{importError}</p>
        )}
        {importPreview.length > 0 && (
          <div className={styles.importPreview}>
            <div className={styles.importPreviewList}>
              {importPreview.map((r, i) => (
                <div key={i} className={styles.importPreviewItem}>
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
                </div>
              ))}
            </div>
            <div className={styles.importActions}>
              <button
                className={styles.importConfirm}
                onClick={handleImportConfirm}
              >
                {importPreview.length}件をインポート
              </button>
              <button
                className={styles.importCancel}
                onClick={handleImportCancel}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </section>

      {(["主菜", "副菜", "汁物"] as const).map((cat) => {
        const group = sortedRecipes.filter((r) => r.category === cat);
        if (group.length === 0) return null;
        return (
          <section key={cat} className={styles.list}>
            <h3
              className={styles.sectionTitle}
              style={{ color: categoryBadgeColor[cat]?.color }}
            >
              {cat}
              <span className={styles.listCount}>{group.length}件</span>
            </h3>
            <div className={styles.cardGrid}>
              {group.map((r) => (
                <div key={r.id} className={styles.card}>
                  <div className={styles.cardHeader}>
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
                    <span className={styles.listSeason}>
                      {formatSeasonMonths(r.seasonMonths)}
                    </span>
                  </div>
                  <span className={styles.cardName}>{r.name}</span>
                  {r.ingredients.length > 0 && (
                    <span className={styles.cardIngredients}>
                      {r.ingredients.join("、")}
                    </span>
                  )}
                  {r.description && (
                    <span className={styles.cardDescription}>{r.description}</span>
                  )}
                  <div className={styles.cardActions}>
                    <button
                      className={styles.editButton}
                      onClick={() => setEditingRecipe(r)}
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
            </div>
          </section>
        );
      })}

      <EditModal
        recipe={editingRecipe}
        onSave={handleEditSave}
        onClose={() => setEditingRecipe(null)}
      />
    </div>
  );
}
