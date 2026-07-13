import { test, expect } from "@playwright/test";

test("home page shows completed phases", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "CollabDocs" })).toBeVisible();
  await expect(page.getByText("Phases 1–10 complete")).toBeVisible();
});

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("register page renders", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
});
