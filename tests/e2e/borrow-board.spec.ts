import { expect, test, type Page } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};

async function closeInitiallyOpenSettings(page: Page): Promise<void> {
  const settings = page.getByRole("dialog", { name: "Settings" });
  if (!(await settings.isVisible().catch(() => false))) return;
  const close = settings.getByRole("button", { name: "close" });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  } else {
    await page.keyboard.press("Escape");
  }
  await expect(settings).toBeHidden();
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= window.innerWidth &&
        document.body.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("short desktop keeps the listing action visible", async ({ page }) => {
  await page.setViewportSize({ width: 1141, height: 602 });
  await page.goto("./");
  await closeInitiallyOpenSettings(page);

  const primaryAction = page.getByRole("button", { name: "List item" });
  await expect(primaryAction).toBeVisible();
  const box = await primaryAction.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.y ?? Infinity) + (box?.height ?? Infinity)).toBeLessThanOrEqual(602);
  await expect(page.locator(".borrow-shelf")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("phone layout keeps the live board and primary action usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await closeInitiallyOpenSettings(page);

  await expect(page.getByRole("heading", { name: "Borrow well. Return trust." })).toBeVisible();
  await expect(page.getByRole("button", { name: "List item" })).toBeVisible();
  await expect(page.locator(".borrow-shelf")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("two peers list, borrow, and return an item with clear ownership", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", {
    storagePrefix: pkg.name,
  });

  try {
    await b.setViewportSize({ width: 390, height: 844 });
    await Promise.all([closeInitiallyOpenSettings(a), closeInitiallyOpenSettings(b)]);
    await a.getByPlaceholder("Name on your listings").fill("Ari");
    await b.getByPlaceholder("Name on your listings").fill("Bea");
    await a.getByPlaceholder("Camping stove, drill, folding table…").fill("Folding table");
    await a.getByRole("button", { name: "List item" }).click();

    await expect(b.getByRole("heading", { name: "Folding table" })).toBeVisible();
    await expect(b.getByText("Listed by Ari", { exact: true })).toBeVisible();
    const borrowItem = b.getByRole("button", { name: "Borrow item" });
    await expect(borrowItem).toBeVisible();
    const borrowBox = await borrowItem.boundingBox();
    expect(borrowBox).not.toBeNull();
    expect((borrowBox?.y ?? Infinity) + (borrowBox?.height ?? Infinity)).toBeLessThanOrEqual(844);
    await expectNoHorizontalOverflow(b);
    await borrowItem.click();

    await expect(b.getByText("Borrowed by you", { exact: true })).toBeVisible();
    await expect(a.getByText("With Bea", { exact: true })).toBeVisible();
    await b.getByRole("button", { name: "Return item" }).click();

    await expect(a.getByText("Your listing", { exact: true })).toBeVisible();
    await expect(b.getByRole("button", { name: "Borrow item" })).toBeVisible();
  } finally {
    await cleanup();
  }
});
