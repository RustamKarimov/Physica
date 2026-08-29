import { expect, test } from "@playwright/test";

test("web viewer bootstrap shell loads", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Physica Web Viewer" }),
  ).toBeVisible();
  await expect(page.getByText("Bootstrap shell only")).toBeVisible();
});
