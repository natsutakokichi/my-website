export type Category = "主菜" | "副菜" | "汁物";

export type MainType = "魚" | "肉";

export interface Recipe {
  id: number;
  name: string;
  category: Category;
  mainType?: MainType;
  /** 旬の月 (1-12)。未指定なら通年 */
  seasonMonths?: number[];
  /** ご飯物（丼など）かどうか */
  isRiceDish?: boolean;
  ingredients: string[];
  description: string;
}

export interface MealPlan {
  main: Recipe;
  side: Recipe;
  side2?: Recipe;
  soup?: Recipe;
}

export interface WeeklyMealPlan {
  days: DayPlan[];
}

export interface DayPlan {
  label: string;
  drinking: boolean;
  plan: MealPlan;
}
