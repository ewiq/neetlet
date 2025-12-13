# leatly

## Description

leatly comes to rescue humanity from doomscrolling.

Create, customize and share your own feed and freely choose what content you want to be exposted to. Fast and lightweight. No login needed and all data is stored on your side. No ai. You get a social media-like feed, but without the addictive, time-robbing and brain-sucking algorithms.
Let's free the internet with Personal Media

## Tech Stack

- **Framework:** SvelteKit - Svelte 5
- **Deployment:** Cloudflare Workers
- **Styling:** Tailwind CSS
- **Database:** IDB, and minimal Cloudflare D1 with Drizzle ORM,

## Architecture & Concepts

- Lightweight, primarily frontend-driven
- Minimal backend usage
- No user auth
- All subscription and settings data stored locally in browser

## Limitations

- Because no data is sent to the cloud, compatibility between devices is impossible.
- Your personal feed collection may miss some articles, as it only fetches data when the app remains open. Although this is quite unusual and only happens with feeds that are aggressively updated with lots of content.
