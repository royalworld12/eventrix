# PostHog error tracking

## What you still need to do

1. Add `POSTHOG_API_KEY` as a protected/masked secret in your actual hosting or CI provider, using that exact name. The personal API key has already been created and written to the local `.env`; do not commit it.
2. Configure the production build environment with `POSTHOG_PROJECT_ID` and `NEXT_PUBLIC_POSTHOG_HOST` using those exact names. The build command is `npm run build`.
3. Configure the deployed app/runtime with `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`. Make the public variables available during the Next.js build as well if your provider separates build and runtime scopes.
4. Ensure production builds have a resolvable release name and version: preserve `.git` in the build context or provide the hosting provider's supported git metadata variables. If the provider supplies neither, explicitly configure both release name and release version through its supported mechanism.
5. Permit the transitive `@posthog/cli` install script in the project's npm policy before a release build, so the platform CLI binary is available. Do not add a global CLI dependency.
6. If the app is built in a container, pass only variables your provider actually supplies; declare required non-secret git/release variables as both `ARG` and `ENV`, and pass `POSTHOG_API_KEY` through the builder's secret mechanism rather than `ARG` or `ENV`.

No repository-owned CI or deployment configuration was found, so the provider-specific secret settings and deploy steps could not be edited here.

## What error tracking does now

Uncaught browser exceptions are captured automatically by `posthog-js` because `capture_exceptions: true` is enabled in `instrumentation-client.ts`. Errors caught by Next.js's global error boundary are also sent explicitly with `posthog.captureException(error)` from `app/global-error.tsx`. Together these cover SDK-observed browser exceptions and errors Next.js catches before browser global handlers can observe them.

The PostHog SDK was already installed and initialized as part of this setup, so this project now has error capture wired into its Next.js app rather than only having configuration documentation.

## Source maps

Source-map upload is wired into the Next.js configuration. The changed files are:

- `next.config.ts`
- `package.json`
- `package-lock.json`
- `.env`
- `.env.example`

Every production `npm run build` uploads source maps when the build environment provides `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`, and `NEXT_PUBLIC_POSTHOG_HOST`. Uploaded maps are deleted after upload. No CI file was added because this repository does not contain a project-owned CI or deployment pipeline.

## Verify it

Trigger any application error, then open [PostHog error tracking](https://us.posthog.com/project/620276/error_tracking) to see the captured exception. Uploaded symbol sets appear in [error-tracking configuration](https://us.posthog.com/project/620276/error_tracking/configuration).
