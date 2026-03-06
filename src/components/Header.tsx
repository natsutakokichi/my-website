import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>🍳 献立プランナー</h1>
      <p className={styles.subtitle}>今日の献立をご提案します</p>
    </header>
  );
}
