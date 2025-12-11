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

## TODO - Current next tasks

### Next

- Clear double searchbar (mobile)
- Refine handleSearch to include title, author, desc etc.

COLLECTIONS:

- Instead of close on sub list, and options in dropdown: delete, hide from main feed, add to collection, copy channel url
- Add 'hide channel from main feed/show channel on main feed option
- Add save to favourites functionality and is saved -> Favourites Collection above subcription button.
- Create automatic Youtube Collection if more than 1 YT channel added.

- Add read for articles already read and display with reduced opacity.
- Add timesDisplayed property to items - when active in viewport for mor than 1s ( or how much?)

### For Later

- Shuffle feed (see below)
- i18n
- Save subscribed rss channels to a global database - Track popularity
- Privacy notice - About page
- Buy me a coffee
- Google analytics
- OPML compatibility
- Enhance first landing page - easily add first rss channels.
- LARGE RSS COMPATIBILITY TESTING (see below collected problems)
- Add api rate limiting
- Domain checking and validation ('extractdomain') refactor and enhancment
- Handle old item deletion
- Implement 'RSS Feed Finder' - If not valid xml URL, but valid page, try to find any rss link on the website and propose to user.
- Create sharable link to import RSS collection (D1 db). Handle slow import in UI. Load list of channels, and then let user select/customize channel list before import
- Enhance "looks like you're new here landing page.
- Check items if paywalled (? - this probably needs to fetch each item content)
- Separate youtube, blog, news, podcasts sections in channel lists
- Implement deletions of oldest (and not saved) items
- Handle feeds with no or invalid pubDate - add date '0'/current when importing?
- Suggestion: Add items that where fetched directly, channel by channel to the feed, not in a batch

### Shuffle algorithm ideas

- Shouldn't be totally random. Fresher contents still at the top. Limit how many consecutive from same channel - Burst suppression - (limit n items per source within X items).
- Prevent 'loud sources' to spam the feed. Consider 'slower' feeds. Round-robin between sources.
- Varying between item types (when videos, podcasts will be implemented).
- When showing items that were previously displayed, consider 'timesDisplayed' or 'msDisplayed' when sorting
  Precompute shuffle key for a few 1000 items in the working set.
- If random+mobile, new shuffle on swipe up (refresh)

## Misc

- Daily chess puzzle (Lichess)
- Daily gospel (scraped)
- Daily art
- Random Wikipedia articles feed
- Today in history (wiki)
- Reddit RSS
- Podcast and media player implementation
- Disable YT shorts

## RSS reader problems

- When subscibing to: https://feeds.content.dowjones.io/public/rss/RSSOpinion
- Image is not loaded properly -> although there clearly is a https://s.wsj.net/media/wsj_apple-touch-icon-180x180.png in source code.
