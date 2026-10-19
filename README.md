# OpsRadar

OpsRadar is a static marketing website built with Next.js and deployed on Vercel.
The public site does not require a database, authentication provider, API keys,
or a local environment file.

## Local development

```bash
npm install
npm run dev
```

## Build and deploy

```bash
npm run build
```

The production build exports static files to `out/`. Vercel serves the site and
keeps its deployment domain configuration in the Vercel project settings.
No Vercel environment variables are required by the website.

## Other code

`src/lib/open-core/` contains a standalone TypeScript operations-rules
prototype. It is not connected to the website.
