import { describe, it, expect } from "vitest";
import { lcsDiff, unifiedDiff, countChanges } from "../diff";

describe("lcsDiff", () => {
  it("знаходить додані та видалені рядки", () => {
    const ops = lcsDiff(["a", "b", "c"], ["a", "x", "c"]);
    expect(ops).toEqual([
      { tag: "eq", line: "a" },
      { tag: "del", line: "b" },
      { tag: "add", line: "x" },
      { tag: "eq", line: "c" },
    ]);
  });

  it("однаковий вміст -> без змін", () => {
    const { additions, deletions } = countChanges("a\nb\n", "a\nb\n");
    expect(additions).toBe(0);
    expect(deletions).toBe(0);
  });
});

describe("unifiedDiff", () => {
  it("формує заголовок і хунк", () => {
    const out = unifiedDiff("f.txt", "a\nb\nc\n", "a\nB\nc\n");
    const txt = out.map((l) => l.text);
    expect(txt[0]).toBe("diff --git a/f.txt b/f.txt");
    expect(txt).toContain("-b");
    expect(txt).toContain("+B");
    expect(txt.some((t) => t.startsWith("@@"))).toBe(true);
  });

  it("новий файл позначається new file", () => {
    const out = unifiedDiff("n.txt", null, "hello\n");
    expect(out.map((l) => l.text)).toContain("new file mode 100644");
  });
});
