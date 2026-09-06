import { expect, test } from "@playwright/test";

test("teacher creates, arranges and previews a multi-scene lesson", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Build the explanation, then present it.",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Create blank lesson" }).click();
  await expect(page.locator(".project-identity b")).toHaveText(
    "Blank investigation",
  );

  await page.getByLabel("Scene title").fill("Opening question");
  await page.getByLabel("Scene title").blur();
  await page
    .getByLabel("Learning objective")
    .fill("Predict how force changes acceleration.");
  await page.getByLabel("Learning objective").blur();

  await page.getByRole("button", { name: "Add scene" }).click();
  await page.getByLabel("Scene title").fill("Explain the relationship");
  await page.getByLabel("Scene title").blur();
  await page
    .getByLabel("Teacher notes")
    .fill("Ask learners to keep mass constant.");
  await page.getByLabel("Teacher notes").blur();

  await page.getByRole("button", { name: "Library" }).click();
  await page.getByPlaceholder("Search cart, text, graph…").fill("Explanation");
  await page.getByRole("button", { name: /Explanation visual-object/ }).click();
  await page
    .getByLabel("Displayed explanation / formula")
    .fill(
      "For a constant mass, a larger resultant force gives a larger acceleration.",
    );
  await page.getByLabel("Displayed explanation / formula").blur();

  await page.getByRole("button", { name: "Preview lesson" }).click();
  await expect(page.getByText("PHYSICA LESSON PREVIEW")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Explain the relationship" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "For a constant mass, a larger resultant force gives a larger acceleration.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Ask learners to keep mass constant."),
  ).toBeVisible();
  if (process.env.PHYSICA_CAPTURE === "1") {
    await page.screenshot({
      path: "docs/teacher-workflow-checkpoint.png",
      fullPage: true,
      animations: "disabled",
    });
  }

  await page.getByRole("button", { name: /01 Opening question/ }).click();
  await expect(
    page.getByText("Predict how force changes acceleration."),
  ).toBeVisible();
});
