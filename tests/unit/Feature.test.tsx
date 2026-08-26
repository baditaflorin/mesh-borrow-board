import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMockRoom } from "@baditaflorin/mesh-common/testing";
import { Feature, clean, validItem } from "../../src/Feature";
import { config } from "../../src/config";
describe("borrow board", () => {
  it("normalizes titles", () => expect(clean("  folding   table ")).toBe("folding table"));
  it("validates items", () =>
    expect(validItem({ id: "a", title: "Drill", ownerId: "p", createdAt: 1 })).toBe(true));
  it("renders shelf", () => {
    render(<Feature room={createMockRoom()} config={config} />);
    expect(screen.getByRole("heading", { name: "Borrow well. Return trust." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List item" })).toBeInTheDocument();
  });
});
