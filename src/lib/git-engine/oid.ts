// Синхронний контент-хеш (не крипто-SHA-1, щоб уникнути async crypto.subtle).
// Дає ті самі навчальні властивості: однаковий вміст -> той самий oid (дедуплікація),
// а коміти різняться завдяки часовій мітці у своєму серіалізованому вигляді.

// FNV-1a (64-біт емуляція через дві 32-бітні половини) -> 40-символьний hex.
export function hash(input: string): string {
  // Дві незалежні FNV-1a хеш-стрічки з різними offset basis для 64-біт результату,
  // плюс ще дві для отримання повних 40 hex-символів (як довжина SHA-1).
  const h1 = fnv1a(input, 0x811c9dc5);
  const h2 = fnv1a(input, 0x01000193);
  const h3 = fnv1a("" + input, 0x811c9dc5);
  const h4 = fnv1a(input + "", 0x01000193);
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return (hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h1 ^ h2 ^ h3 ^ h4)).slice(0, 40);
}

function fnv1a(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    // h *= 16777619 (FNV prime) з обмеженням до 32 біт
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Скорочений вигляд oid, як у git (7 символів). */
export function short(oid: Oid): string {
  return oid.slice(0, 7);
}

// Локальний імпорт типу, щоб не тягнути залежність.
type Oid = string;
