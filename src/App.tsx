import { useState } from "react";
import { Header } from "./components/Header";
import { RandomMealPlan } from "./components/RandomMealPlan";
import { IngredientMealPlan } from "./components/IngredientMealPlan";
import { RecipeManager } from "./components/RecipeManager";
import styles from "./App.module.css";

type Tab = "random" | "ingredient" | "manage";

function App() {
  const [tab, setTab] = useState<Tab>("random");

  return (
    <div className={styles.app}>
      <Header />
      <nav className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "random" ? styles.active : ""}`}
          onClick={() => setTab("random")}
        >
          <span className={styles.tabIcon}>🎲</span>
          <span className={styles.tabLabel}>おまかせ献立</span>
        </button>
        <button
          className={`${styles.tab} ${tab === "ingredient" ? styles.active : ""}`}
          onClick={() => setTab("ingredient")}
        >
          <span className={styles.tabIcon}>🥬</span>
          <span className={styles.tabLabel}>食材から探す</span>
        </button>
        <button
          className={`${styles.tab} ${tab === "manage" ? styles.active : ""}`}
          onClick={() => setTab("manage")}
        >
          <span className={styles.tabIcon}>📝</span>
          <span className={styles.tabLabel}>レシピ登録</span>
        </button>
      </nav>
      <main className={styles.main}>
        {tab === "random" && <RandomMealPlan />}
        {tab === "ingredient" && <IngredientMealPlan />}
        {tab === "manage" && <RecipeManager />}
      </main>
    </div>
  );
}

export default App;
