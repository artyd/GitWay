// Уніфікований каталог команд — єдине джерело для Тренажера, CLI-вкладки та квізів.

import catalogJson from "@/content/catalog.json";
import type { CatalogEntry } from "./types";

export const CATALOG = catalogJson as CatalogEntry[];

export const CATALOG_BY_ID: Record<string, CatalogEntry> = Object.fromEntries(
  CATALOG.map((c) => [c.id, c]),
);

export const CATALOG_IDS = new Set(CATALOG.map((c) => c.id));
