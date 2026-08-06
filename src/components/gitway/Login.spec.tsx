// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import GitWayApp from "./GitWayApp";

afterEach(cleanup);

describe("Екран входу — крок 1 (відділ) → крок 2 (ПІБ)", () => {
  it("крок 1 показує відділи: закупівлі перший, логістика другий", () => {
    render(<GitWayApp />);
    expect(screen.getByText("Закупівлі")).toBeTruthy();
    expect(screen.getByText("Логістика")).toBeTruthy();
    expect(screen.getByText("Продажі")).toBeTruthy();
    expect(screen.getByText("Юридичний")).toBeTruthy();
  });

  it("крок 2 показує ПІБ учасників обраного відділу", () => {
    render(<GitWayApp />);
    fireEvent.click(screen.getByText("Логістика"));
    expect(screen.getByText("Волкова Елена Николаевна")).toBeTruthy();
    expect(screen.getByText("Субота Карина")).toBeTruthy();
    // повернення до вибору відділу
    fireEvent.click(screen.getByText("Інший відділ"));
    expect(screen.getByText("Закупівлі")).toBeTruthy();
  });

  it("відділ «Продажі» містить нових учасників", () => {
    render(<GitWayApp />);
    fireEvent.click(screen.getByText("Продажі"));
    expect(screen.getByText("Походенко Осорио")).toBeTruthy();
    expect(screen.getByText("Костенко Татьяна")).toBeTruthy();
    expect(screen.getByText("Дунас Анжела")).toBeTruthy();
  });

  it("у відділі «Продажі» блоки викладені сіткою 4 колонки", () => {
    render(<GitWayApp />);
    fireEvent.click(screen.getByText("Продажі"));
    const card = screen.getByText("Дунас Анжела").closest("button")!;
    const list = card.parentElement!;
    expect(list.style.display).toBe("grid");
    expect(list.style.gridTemplateColumns).toBe("repeat(4,1fr)");
  });
});
