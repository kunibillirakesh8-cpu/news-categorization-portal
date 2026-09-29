# KIET News Hub

A responsive campus newsroom and student highlights demo with a React/TypeScript frontend, Spring Boot REST API, PostgreSQL storage, and a FastAPI TF-IDF classifier.

## Demo mode

The frontend starts with sample news, campus stories, social posts, comments, and moderation actions. It can be explored without API keys or a database. Use the role selector in the top bar to preview guest, student, editor, admin, and super-admin views. Browser-side demo changes live in memory and reset when the page reloads.

## Run the frontend

Requires Node 20.19 or newer.

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, typically `http://localhost:5173`.

## Run the services

With Docker Desktop installed:

```powershell
docker compose up --build
```

Open `http://localhost:8088`. The Java API is available on the internal Compose network at port 8080, PostgreSQL at 5432, and the classifier at 8000. Set strong values in `.env` before any non-demo deployment. Set `SUPER_ADMIN_EMAIL` to Rakesh Kunibilli's verified account email; only that account may receive the Super Admin role. The local Compose credentials are for development only.

The API supports registration/login with BCrypt-hashed passwords and JWTs; published news/highlights are public; signed-in students can publish KIET News and highlights directly. Generated stories can be published immediately to a selected Daily News category. Admin role changes require Super Admin. The upload API accepts JPG, PNG, WebP, MP4, WebM, and MOV, with a server-enforced 300 MB cap.

The classifier uses a small, transparent demo corpus with TF-IDF and logistic regression. Java keyword predicates provide tags, and the Java AVL index keeps title lookups. This demo classifier is not production-quality editorial verification: generated or classified content still requires human review.

Daily News begins with seeded demo stories for every category. To collect new stories, set `NEWS_FEED_URLS` to comma-separated HTTPS RSS/Atom feed URLs. YouTube channel feeds use `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`. Only feeds you are authorized to consume should be configured; the app does not scrape Way2News. The service refreshes feeds every 30 minutes by default.

The language selector translates story headlines and summaries through MyMemory. Translation requires internet access and may be rate-limited; when unavailable, the original source text remains visible. Photo source extraction uses Tesseract.js in the browser and supports clear printed text best.

## Services

- `frontend/`: React 19, TypeScript, Vite, Tailwind CSS 4, Lucide icons
- `backend/`: Java 21, Spring Boot 3, Spring Security, JWT, PostgreSQL/JPA
- `ml-service/`: Python 3.13, FastAPI, scikit-learn