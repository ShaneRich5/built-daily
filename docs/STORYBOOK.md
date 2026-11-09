# Storybook

Storybook is where UI components are designed and reviewed in isolation,
before (or instead of) clicking through the real app.

## Run it

```bash
npm run storybook          # dev server at http://localhost:6006
npm run build-storybook    # static build into storybook-static/ (gitignored)
```

Stories live next to their components as `*.stories.tsx` (for example
[`features/workout-session/`](../features/workout-session/)). Sample data for
stories goes in a `story-fixtures.ts` beside them, never in app code.

The toolbar has a **Theme** switch (light / dark) and an **Accessibility**
panel (axe checks on every story). Stories render inside a 390px phone-width
frame by default; set `parameters: { frame: "none" }` for full-screen sheets.

Nothing in Storybook talks to Firebase: there is no signed-in user, so
repository calls return empty results and nothing is saved.

## Hosting

[`.github/workflows/storybook.yml`](../.github/workflows/storybook.yml) builds
Storybook on every push to `main` that touches UI code and publishes it to
GitHub Pages at **https://shanerich5.github.io/built-daily/**. It's a separate
deploy from the app: Vercel never builds Storybook, and the Pages site has no
access to app data.

One-time setup (already done if the link works): repo **Settings → Pages →
Build and deployment → Source: GitHub Actions**. You can also run the workflow
by hand from the Actions tab (**Storybook → Run workflow**).
