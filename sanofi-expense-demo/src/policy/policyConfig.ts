const MEAL_LIMIT_KEY = "expense_demo_meal_limit_cad";
const DEFAULT_MEAL_LIMIT_CAD = 60;

export function getMealLimitPerPersonCad(): number {
  try {
    const raw = localStorage.getItem(MEAL_LIMIT_KEY);
    if (raw === null) return DEFAULT_MEAL_LIMIT_CAD;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_MEAL_LIMIT_CAD;
  } catch {
    return DEFAULT_MEAL_LIMIT_CAD;
  }
}

export function setMealLimitPerPersonCad(value: number): void {
  try {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      localStorage.setItem(MEAL_LIMIT_KEY, String(n));
    }
  } catch {
    /* ignore */
  }
}
