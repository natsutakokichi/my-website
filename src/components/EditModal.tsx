import { useState, useEffect } from "react";
import type { Category, MainType, Recipe } from "../types";
import styles from "./EditModal.module.css";

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const MONTH_LABELS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

interface EditModalProps {
  recipe: Recipe | null;
  onSave: (recipe: Recipe) => void;
  onClose: () => void;
}

export function EditModal({ recipe, onSave, onClose }: EditModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("主菜");
  const [mainType, setMainType] = useState<MainType>("肉");
  const [ingredientsText, setIngredientsText] = useState("");
  const [description, setDescription] = useState("");
  const [useSeason, setUseSeason] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (recipe) {
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
    }
  }, [recipe]);

  if (!recipe) return null;

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

  const handleSave = () => {
    if (!name.trim()) return;
    const ingredients = ingredientsText
      .split(/[,、\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const seasonMonths =
      useSeason && selectedMonths.size > 0
        ? [...selectedMonths].sort((a, b) => a - b)
        : undefined;
    onSave({
      id: recipe.id,
      name: name.trim(),
      category,
      mainType: category === "主菜" ? mainType : undefined,
      seasonMonths,
      ingredients,
      description: description.trim(),
    });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <h3 className={styles.title}>レシピを編集</h3>
        <div className={styles.field}>
          <label className={styles.label}>レシピ名</label>
          <input
            className={styles.input}
            type="text"
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
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>説明（任意）</label>
          <input
            className={styles.input}
            type="text"
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
        <div className={styles.actions}>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={!name.trim()}
          >
            更新する
          </button>
          <button className={styles.cancelButton} onClick={onClose}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
