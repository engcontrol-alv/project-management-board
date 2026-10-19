export function newId<T extends string = string>(): T {
  return crypto.randomUUID() as T;
}
