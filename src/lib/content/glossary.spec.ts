import { describe, it, expect } from "vitest";
import { findTermMatches, glossaryMatcher } from "./glossary";

describe("glossary matcher", () => {
  it("будує валідний регекс", () => {
    expect(() => glossaryMatcher()).not.toThrow();
  });

  it("знаходить термін у тексті", () => {
    const m = findTermMatches("Тут потрібен рефакторинг коду.");
    expect(m.length).toBe(1);
    expect(m[0].entry.term).toContain("рефакторинг");
    expect(m[0].text).toBe("рефакторинг");
  });

  it("не підсвічує «баг» усередині «багато»", () => {
    const m = findTermMatches("У нас багато роботи і зовсім немає багатіїв.");
    expect(m.length).toBe(0);
  });

  it("матчить інфлектовану форму зі списку", () => {
    const m = findTermMatches("Через merge conflict довелося обирати руками. Конфлікту не уникнути.");
    const terms = m.map((x) => x.text.toLowerCase());
    expect(terms).toContain("merge conflict");
  });

  it("підсвічує лише перше входження кожного терміна", () => {
    const m = findTermMatches("коміт, ще коміт і знову коміт");
    expect(m.length).toBe(1);
    expect(m[0].start).toBe(0);
  });

  it("латинські терміни — регістронезалежно, але цілим словом", () => {
    const m = findTermMatches("Зроби git PUSH, а не pushover.");
    const texts = m.map((x) => x.text.toLowerCase());
    expect(texts).toContain("push");
    // 'pushover' не має матчитись як push
    expect(m.filter((x) => x.text.toLowerCase() === "push").length).toBe(1);
  });
});
