/**
 * Author / submission profile — shown in the app footer.
 * Override via NEXT_PUBLIC_* env vars before deploy.
 */
export const AUTHOR = {
  name: process.env.NEXT_PUBLIC_AUTHOR_NAME ?? "Damandeep Kour",
  github:
    process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/DamandeepKour/",
  linkedin:
    process.env.NEXT_PUBLIC_LINKEDIN_URL ??
    "https://www.linkedin.com/in/damandeep-kour-104264251/",
  email: process.env.NEXT_PUBLIC_AUTHOR_EMAIL ?? "daman1901319@gmail.com",
} as const;
