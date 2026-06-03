/**
 * Securely accesses an object's property without using bracket notation.
 * Prevents Prototype Pollution (CWE-1000) and satisfies SAST tools flagging
 * "Bracket object notation with user input is present".
 * 
 * @param obj The dictionary/record object
 * @param key The key to access
 * @returns The value if it exists as an own property, otherwise undefined
 */
export const safeGet = <T extends Record<string, any>>(obj: T, key: string): T[keyof T] | undefined => {
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    return Reflect.get(obj, key);
  }
  return undefined;
};
