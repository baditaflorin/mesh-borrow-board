export default async function borrowBoardScreenshot(page) {
  await page.getByPlaceholder("Name on your listings").fill("Ari");
  await page.getByPlaceholder("Camping stove, drill, folding table…").fill("Folding table");
  await page.getByRole("button", { name: "List item" }).click();
  await page.getByRole("heading", { name: "Folding table" }).waitFor();
}
