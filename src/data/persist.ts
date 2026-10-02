/** Whether Chrome has agreed to keep our data. Null if the browser can't say. */
export async function isPersisted(): Promise<boolean | null> {
  if (!navigator.storage?.persisted) return null;
  return navigator.storage.persisted();
}

/** Ask Chrome not to evict our IndexedDB data. Safe to call on every launch. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
