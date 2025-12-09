# Project Description

## Tech Stack

- **Framework:** SvelteKit with Svelte 5 (runes)
- **Deployment:** Cloudflare Workers
- **Styling:** Tailwind CSS
- **Database:** Cloudflare D1 with Drizzle ORM

## Architecture & Concepts

- Lightweight, primarily frontend-driven
- Minimal backend usage
- No user authentication
- All subscription and settings data stored in `localStorage`

## UI Overview

- Social media-like infinite feed of RSS articles presented as cards
- Scroll-snap behavior between cards
- Clicking a card opens the article on the same page (configurable to `target_blank`)
- Returning to the feed preserves the user's scroll position
- Light and dark mode support

### Feed Behavior

- Recently read or closed items from the last few days are tracked
  - **Read:** Displayed with reduced opacity
  - **Closed:** Hidden from the feed

- Current algorithm shows RSS items in a fully random order
- Lazy loading for performance

## Future Data Sources

- YouTube channel subscriptions
- Daily chess puzzle (Lichess)
- Daily gospel (scraped)
- Daily art
- Random Wikipedia articles feed
- Reddit RSS

## Implementation Ideas

- Add a "favourite" button for articles
- Keyboard navigation
- Customize target_blank in settings
- Store user-added RSS feeds in D1 with metadata (only if not already present)
- Improve randomization so newer content floats higher

### Additional ideas for later

- Category filter
- Today in history

## TODO - Current next tasks

- If scrolled down (and no special search or feed query), only scroll to top on navigation to previous (like social media pages) -> And shuffle if allowed in settings
- Implement periodical feed update -> and delete older ones (30 day/10k items cap )
- Add read/close functionality - maybe track each post with timer
- If random+mobile, new shuffle on swipe up.
- Add keyboard navigation between posts
- Save subscribed channels to a global database - Track popularity
- Privacy notice - About page
- Buy me a coffee
- Enhance first landing page - easily add first rss channels
- Add api rate limiting
- Solve scroll-snap issues: Menu visibility and search results snapping

- Create sharable link to import RSS collection (D1 db). Handle slow import in UI. Load list of channels, and then let user select/customize channel list before import
- Add OPML compatibility
- Reorder/Categorize subscriptions (?)
- Enhance "looks like you're new here landing page.
- Settings: strictly date sort or randomize
- If sharable link - first initialization will probably take a long time - welcome and waiting page for that

- IMPLEMENT FULL PAGE RSS SCRAPER

### Shuffle algorithm ideas

Shouldn't be totally random. Fresher contents still at the top. Limit how many consecutive from same channel - Burst suppression” (limit n items per source within X items).
Prevent 'loud sources' to spam the feed. Consider 'slower' feeds. Round-robin between sources.
Varying between item types (when videos, podcasts will be implemented).
When showing items that were previously displayed, consider 'timesDisplayed' or 'msDisplayed' when sorting
Precompute shuffle key for a few 1000 items in the working set.
