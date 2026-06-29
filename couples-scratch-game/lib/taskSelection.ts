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

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
  // 1. Filter out seen tasks
  const unseenAvailable = allTasks.filter(t => !seenIds.includes(t.id));
  console.log("[DEBUG selectNextTask] allTasks count:", allTasks.length);
  console.log("[DEBUG selectNextTask] seenIds count:", seenIds.length);
  console.log("[DEBUG selectNextTask] unseenAvailable count:", unseenAvailable.length);
  
  if (unseenAvailable.length === 0) return null;

  // Find range of levels
  const lowestAvailableLevel = Math.min(...unseenAvailable.map(t => t.level));
  const maxAvailableLevel = Math.max(...unseenAvailable.map(t => t.level));
  console.log("[DEBUG selectNextTask] Level range:", lowestAvailableLevel, "to", maxAvailableLevel);

  let currentSearchLevel = lowestAvailableLevel;

  while (currentSearchLevel <= maxAvailableLevel) {
    let eligible = unseenAvailable.filter(t => t.level === currentSearchLevel);
    console.log(`[DEBUG selectNextTask] Level ${currentSearchLevel} candidates count:`, eligible.length);

    if (unlockedCategories) {
      console.log("[DEBUG selectNextTask] unlockedCategories:", unlockedCategories);
      eligible = eligible.filter(t => {
        if (hasCategory(t)) {
          const isMatch = unlockedCategories.includes(t.category);
          if (!isMatch) console.log(`[DEBUG selectNextTask] filtered out ${t.id} (${t.category})`);
          return isMatch;
        }
        return true;
      });
    }

    if (eligible.length > 0) {
      console.log(`[DEBUG selectNextTask] Found ${eligible.length} eligible tasks at Level ${currentSearchLevel}`);
      const shuffled = shuffleArray(eligible);
      return shuffled[0];
    }

    console.log(`[DEBUG selectNextTask] No eligible tasks at Level ${currentSearchLevel}, trying next level...`);
    currentSearchLevel++;
  }

  console.log("[DEBUG selectNextTask] No eligible tasks found in any level.");
  return null;
}
