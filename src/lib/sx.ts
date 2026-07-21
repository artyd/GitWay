import type { CSSProperties } from "react";

/**
 * Парсер інлайн-стилів: перетворює CSS-рядок (як у прототипі, kebab-case)
 * у React.CSSProperties. Дозволяє переносити стилі 1:1 без ручної конвертації.
 */
export function sx(css: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const rawProp = decl.slice(0, i).trim();
    const value = decl.slice(i + 1).trim();
    if (!rawProp || !value) continue;
    // --custom-props лишаємо як є; решту переводимо в camelCase
    const prop = rawProp.startsWith("--")
      ? rawProp
      : rawProp.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[prop] = value;
  }
  return out as CSSProperties;
}
