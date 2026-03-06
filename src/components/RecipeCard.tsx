import { useState } from "react";
import type { Recipe } from "../types";
import { isLiked, toggleLike } from "../data/likeStore";
import styles from "./RecipeCard.module.css";

interface Props {
  recipe: Recipe;
  showDetails?: boolean;
}

const categoryColor: Record<string, string> = {
  主菜: "#ff6b6b",
  副菜: "#51cf66",
  汁物: "#339af0",
};

export function RecipeCard({ recipe, showDetails = false }: Props) {
  const [liked, setLiked] = useState(() => isLiked(recipe.id));

  const handleLike = () => {
    const next = toggleLike(recipe.id);
    setLiked(next);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span
          className={styles.badge}
          style={{ backgroundColor: categoryColor[recipe.category] }}
        >
          {recipe.category}
        </span>
        <span className={styles.name}>{recipe.name}</span>
        <button
          className={`${styles.likeButton} ${liked ? styles.liked : ""}`}
          onClick={handleLike}
          aria-label={liked ? "いいね解除" : "いいね"}
        >
          {liked ? "♥" : "♡"}
        </button>
      </div>
      {showDetails && (
        <div className={styles.detailsContent}>
          <p className={styles.description}>{recipe.description}</p>
          <div className={styles.ingredients}>
            {recipe.ingredients.map((ing) => (
              <span key={ing} className={styles.tag}>
                {ing}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
