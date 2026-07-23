// Реєстр учасників навчання: відділи + люди. Вхід — вибір відділу, потім ПІБ.
// Прогрес зберігається на сервері за ключем person.id (стабільний = deptKey + ПІБ).

export type Department = { key: string; name: string; icon: string; color: string };
export type Person = { name: string; deptKey: string };

// Порядок відділів у виборі входу: закупівлі — перші, логістика — другі (за вимогою).
export const DEPARTMENTS: Department[] = [
  { key: "zakupivli", name: "Закупівлі", icon: "fa-solid fa-cart-shopping", color: "#e6a15a" },
  { key: "logistyka", name: "Логістика", icon: "fa-solid fa-truck", color: "#3aa6c4" },
  { key: "prodazhi", name: "Продажі", icon: "fa-solid fa-handshake", color: "#14b8a6" },
  { key: "finance", name: "Бухгалтерія / Фінанси", icon: "fa-solid fa-coins", color: "#3fae7a" },
  { key: "hr", name: "HR", icon: "fa-solid fa-users", color: "#cf6a9c" },
  { key: "it", name: "ІТ", icon: "fa-solid fa-laptop-code", color: "#7c6ee0" },
  { key: "legal", name: "Юридичний", icon: "fa-solid fa-scale-balanced", color: "#5b76c9" },
  { key: "director", name: "Директор", icon: "fa-solid fa-user-tie", color: "#e0a03e" },
];

// Список учасників. Порядок у межах відділу — як у наданому переліку.
// Рядки без ПІБ (лише відділ) у джерелі пропущено — за потреби додати сюди.
export const PEOPLE: Person[] = [
  { name: "Абрамова Алина", deptKey: "zakupivli" },
  { name: "Демченко Алина", deptKey: "zakupivli" },
  { name: "Карикова Алиса", deptKey: "zakupivli" },
  { name: "Гуцалюк Матвій", deptKey: "zakupivli" },
  { name: "Орехова Алина", deptKey: "zakupivli" },
  { name: "Свистельник Артём", deptKey: "zakupivli" },
  { name: "Гевлич Таисия", deptKey: "zakupivli" },
  { name: "Шостак Марина", deptKey: "zakupivli" },

  { name: "Волкова Елена Николаевна", deptKey: "logistyka" },
  { name: "Романова Олеся", deptKey: "logistyka" },
  { name: "Сибирская Людмила", deptKey: "logistyka" },
  { name: "Субота Карина", deptKey: "logistyka" },

  { name: "Денисенко Анна", deptKey: "prodazhi" },
  { name: "Карпенко Марина", deptKey: "prodazhi" },
  { name: "Куринна Виталина", deptKey: "prodazhi" },
  { name: "Лукавенко Виталий", deptKey: "prodazhi" },
  { name: "Спивак Владислава", deptKey: "prodazhi" },
  { name: "Коваленко Маргарита", deptKey: "prodazhi" },
  { name: "Пермякова Инна", deptKey: "prodazhi" },
  { name: "Озерова Виктория", deptKey: "prodazhi" },
  { name: "Ярцева Леся", deptKey: "prodazhi" },

  { name: "Ковтун Анна", deptKey: "finance" },
  { name: "Шевченко Татьяна", deptKey: "finance" },

  { name: "Тахтаулова Алина", deptKey: "hr" },

  { name: "Зубар Руслан", deptKey: "it" },
  { name: "Шульгина Юлия", deptKey: "it" },
  { name: "Горпинко Сергей", deptKey: "it" },

  { name: "Верещагина Виктория", deptKey: "legal" },

  { name: "Мороз Ольга Валентиновна", deptKey: "director" },
];

const DEPT_BY_KEY = new Map(DEPARTMENTS.map((d) => [d.key, d]));

export function deptByKey(key: string): Department | undefined {
  return DEPT_BY_KEY.get(key);
}

export function peopleByDept(deptKey: string): Person[] {
  return PEOPLE.filter((p) => p.deptKey === deptKey);
}

// Стабільний ідентифікатор учасника (ключ прогресу в БД).
export function personId(p: Person): string {
  return `${p.deptKey}:${p.name}`;
}

// Ініціали з перших двох слів ПІБ.
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Уніфікований «акаунт» для UI (як старий Account), похідний від Person + Department.
export type RosterAccount = {
  id: string;
  name: string;
  department: string; // назва відділу
  deptKey: string;
  initials: string;
  color: string;
  icon: string;
};

export function toAccount(p: Person): RosterAccount {
  const d = DEPT_BY_KEY.get(p.deptKey);
  return {
    id: personId(p),
    name: p.name,
    department: d?.name ?? p.deptKey,
    deptKey: p.deptKey,
    initials: initialsOf(p.name),
    color: d?.color ?? "#14b8a6",
    icon: d?.icon ?? "fa-solid fa-user",
  };
}
