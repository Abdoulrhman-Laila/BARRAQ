/**
 * Read the browser's current control value at submit time. Password managers
 * can update a visible input without dispatching the React change event, so
 * controlled component state is only a fallback rather than the authority.
 */
export function nativeTextValue(formData: FormData, name: string, fallback: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : fallback;
}
