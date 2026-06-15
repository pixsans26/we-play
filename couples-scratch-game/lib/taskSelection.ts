import { Task, ImageTask, LEVEL_CATEGORIES } from "@/types";

/**
 * Returns the unlocked categories for a given level.
 * Uses LEVEL_CATEGORIES mapping, defaulting to all categories for levels >= 5.
 */
export function getCategoriesForLevel(level: number): string[] {
  if (level >= 5) {
    return LEVEL_CATEGORIES[5];
  }
  return LEVEL_CATEGORIES[level] ?? LEVEL_CATEGORIES[1];
}

/**
 * Type guard to check if a task has a category field (i.e., is a text Task).
 */
function hasCategory(task: Task | ImageTask): task is Task {
  return "category" in task;
}

/**
 * Selects the next unseen task for a user based on:
 * 1. Task type (image or text)
 * 2. User's current level (only tasks at or below)
 * 3. User's history (exclude seen task IDs)
 * 4. Unlocked categories (only for text tasks with a category field)
 * 5. Random selection from eligible pool
 *
 * Returns null if no eligible tasks remain.
 */
export function selectNextTask<T extends Task | ImageTask>(
  allTasks: T[],
  seenIds: string[],
  currentLevel: number,
  unlockedCategories?: string[]
): T | null {
  // 1. Filter out seen tasks and tasks above current level
  const unseenAvailable = allTasks.filter(t => !seenIds.includes(t.id) && t.level <= currentLevel);
  
  if (unseenAvailable.length === 0) return null;

  // 2. Find the lowest level among available unseen tasks (Level 1 then Level 2...)
  const lowestAvailableLevel = Math.min(...unseenAvailable.map(t => t.level));

  // 3. Filter to only include tasks from this lowest available level
  let eligible = unseenAvailable.filter(t => t.level === lowestAvailableLevel);

  // 4. (For text tasks) Filter by categories unlocked for this specific level
  if (unlockedCategories) {
    const categoriesForThisLevel = getCategoriesForLevel(lowestAvailableLevel);
    eligible = eligible.filter(t => {
      if (hasCategory(t)) {
        return categoriesForThisLevel.includes(t.category);
      }
      return true;
    });
  }

  if (eligible.length === 0) return null;

  // 5. Randomly shuffle/pick one
  const idx = Math.floor(Math.random() * eligible.length);
  return eligible[idx];
}
