import { useState } from "react";
import type { WeeklyMealPlan } from "../types";
import { generateWeeklyMealPlan } from "../utils/mealPlanner";
import { RecipeCard } from "./RecipeCard";
import styles from "./RandomMealPlan.module.css";

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

export function RandomMealPlan() {
  const [weekly, setWeekly] = useState<WeeklyMealPlan | null>(null);
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());
  const [drinkingDays, setDrinkingDays] = useState<boolean[]>(
    new Array(7).fill(false)
  );

  const handleGenerate = () => {
    setWeekly(generateWeeklyMealPlan(drinkingDays));
    setOpenDays(new Set());
  };

  const toggleDay = (label: string) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const toggleDrinking = (index: number) => {
    setDrinkingDays((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  return (
    <div className={styles.container}>
      <p className={styles.description}>
        ボタンを押すと、1週間分の献立を提案します。
        <br />
        <span className={styles.hint}>
          主菜は魚と肉が交互になるようバランスよく構成されます。
        </span>
      </p>
      <div className={styles.drinkingSection}>
        <p className={styles.drinkingLabel}>お酒を飲む日</p>
        <div className={styles.drinkingRow}>
          {DAY_LABELS.map((label, i) => (
            <label key={label} className={styles.drinkingCheck}>
              <input
                type="checkbox"
                checked={drinkingDays[i]}
                onChange={() => toggleDrinking(i)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <p className={styles.drinkingHint}>
          チェックした日はご飯物を除外し、副菜2品（汁物なし）になります
        </p>
      </div>
      <button className={styles.button} onClick={handleGenerate}>
        1週間の献立を提案
      </button>
      {weekly && (
        <div className={styles.weekGrid}>
          {weekly.days.map((day) => {
            const isOpen = openDays.has(day.label);
            return (
              <div
                key={day.label}
                className={`${styles.dayColumn} ${day.drinking ? styles.drinkingDay : ""}`}
              >
                <h3 className={styles.dayLabel}>
                  {day.label}
                  {day.drinking && (
                    <span className={styles.drinkingBadge}>お酒</span>
                  )}
                </h3>
                <div className={styles.dayCards}>
                  <RecipeCard recipe={day.plan.main} showDetails={isOpen} />
                  <RecipeCard recipe={day.plan.side} showDetails={isOpen} />
                  {day.plan.side2 && (
                    <RecipeCard recipe={day.plan.side2} showDetails={isOpen} />
                  )}
                  {day.plan.soup && (
                    <RecipeCard recipe={day.plan.soup} showDetails={isOpen} />
                  )}
                </div>
                <button
                  className={styles.toggleButton}
                  onClick={() => toggleDay(day.label)}
                >
                  {isOpen ? "▲ 詳細を閉じる" : "▼ 詳細を見る"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
