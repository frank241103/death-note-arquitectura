# Death Note Project Instructions

## Scope
This repository contains a full-stack application with a Go backend and a React/Vite frontend.

## Architecture notes
- Keep backend logic organized in the existing folders under /back.
- Keep UI components under /front/src/components and pages under /front/src/pages.
- Maintain TypeScript types in /front/src/types.

## Preferred approach
1. Understand the current feature and the relevant files before editing.
2. Make the smallest change that solves the problem.
3. Keep the frontend and backend in sync for shared features.
4. Validate the result with the appropriate build or test command.

## Commands
- Backend build: go build ./...
- Frontend build: npm run build
- Full stack with Docker: docker compose up --build
