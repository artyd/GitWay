// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import GitWayApp from "./GitWayApp";

afterEach(cleanup);

describe("Екран входу — 9 відділів", () => {
  it("показує всі відділи, зокрема чотири нові", () => {
    render(<GitWayApp />);
    // наявні
    expect(screen.getByText("Відділ закупівель")).toBeTruthy();
    expect(screen.getByText("Директор")).toBeTruthy();
    // нові
    expect(screen.getByText("Фінансовий відділ")).toBeTruthy();
    expect(screen.getByText("Юридичний відділ")).toBeTruthy();
    expect(screen.getByText("Відділ обладнання")).toBeTruthy();
    expect(screen.getByText("Відділ персоналу")).toBeTruthy();
  });
});
