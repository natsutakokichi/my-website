const STORAGE_KEY = "meal-planner-likes";

function load(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function save(ids: Set<number>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function isLiked(id: number): boolean {
  return load().has(id);
}

export function toggleLike(id: number): boolean {
  const ids = load();
  if (ids.has(id)) {
    ids.delete(id);
  } else {
    ids.add(id);
  }
  save(ids);
  return ids.has(id);
}

export function getLikedIds(): Set<number> {
  return load();
}
