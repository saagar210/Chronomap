import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const mockScriptPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "support",
  "tauri-mock.js",
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript({ path: mockScriptPath });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test("core timeline smoke flow works in the browser harness", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByText("Welcome to ChronoMap")).toBeVisible();

  await page.getByRole("button", { name: "Create Blank" }).click();
  await expect(page.getByRole("button", { name: "Add Track" })).toBeVisible();

  await page.getByRole("button", { name: "Add Track" }).click();
  const trackDialog = page.getByRole("dialog", { name: "New Track" });
  await trackDialog.getByLabel("Name").fill("Milestones");
  await trackDialog.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText('Created track "Milestones"')).toBeVisible();

  await page.getByTitle("Add event").click();
  await expect(page.getByRole("heading", { name: "New Event" })).toBeVisible();
  await page.getByLabel("Title").fill("Apollo 11");
  await page.getByLabel("Date").fill("1969-07-20");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText('Created "Apollo 11"')).toBeVisible();

  await page.getByPlaceholder("Search events... (Cmd+F)").fill("Apollo");
  await expect(page.getByRole("button", { name: /Apollo 11/ })).toBeVisible();

  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("button", { name: "Export as JSON" }).click();
  await expect(page.getByText("Export complete")).toBeVisible();

  const savedFiles = await page.evaluate(() =>
    (
      window as Window & {
        __CHRONOMAP_TEST__: { getSavedFiles: () => Record<string, string> };
      }
    ).__CHRONOMAP_TEST__.getSavedFiles(),
  );
  expect(Object.values(savedFiles).join("\n")).toContain("Apollo 11");

  await page.getByRole("button", { name: /Disconnected/ }).click();
  await expect(page.getByText("Ollama not detected")).toBeVisible();
});

test("csv import stays safe when required columns are missing", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Create Blank" }).click();
  await page.evaluate(() => {
    (
      window as Window & {
        __CHRONOMAP_TEST__: {
          seedFile: (path: string, content: string) => void;
        };
      }
    ).__CHRONOMAP_TEST__.seedFile(
      "/mock/bad.csv",
      "label,when\nMoon Landing,1969-07-20",
    );
  });

  await page.getByTitle("Import").click();
  await page.getByRole("button", { name: "CSV Import" }).click();

  await expect(
    page.getByText("Map your CSV columns to event fields."),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog", { name: "Import Timeline Data" })
      .getByRole("button", { name: /^Import$/ }),
  ).toBeDisabled();
});
