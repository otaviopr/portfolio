# Secure GitHub publishing bridge

This Cloudflare Worker keeps the GitHub App private key and client secret off the public portfolio. The admin sends content files to `POST /publish`; the Worker uses a short-lived installation token to commit them to `otaviopr/portfolio`.

## One-time account setup

1. In Cloudflare, create a free Worker and KV namespace named `otavio-portfolio-sessions`. Copy its ID into `wrangler.toml`.
2. Replace `YOUR-DOMAIN` and `YOUR-WORKER` in `wrangler.toml` and `github-app-manifest.json`. Use a Worker custom domain such as `auth.your-domain.com` so its session cookie can be used by `your-domain.com/admin`.
3. Create a GitHub App from the manifest at GitHub **Settings → Developer settings → GitHub Apps → New GitHub App**. Install it only on the `otaviopr/portfolio` repository, with **Contents: Read and write** permission.
4. Generate a private key for the app and add these secrets in Cloudflare: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_CLIENT_ID`, and `GITHUB_CLIENT_SECRET`.
5. Deploy with `npx wrangler deploy` from this folder.

The app needs this final account setup because its client secret and private key must never be committed to the repository.
