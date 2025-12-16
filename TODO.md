### NEXT

- OPTIMIZE +layout.ts to load items only slices
- Move filtering logic to +layout.ts (?) when loading data

- Optimize syncing - only when on main feed - and on top of page - no sync when Subs dropdown is s
- Correct bug where syncing time get registered in local storage upon unsuccesful sync
- Add isLoadingRemoving to subs listItem deletion (no opacity)
- Faster syncing - load channel items sequentially to feed?
- Better UI syncing: display the 'loading' FeedHeader even if no real syncing
- Better UI syncing: presync in the background and faster refresh when user requests a reload

### BUGS

- Keyboard post navigation has buggy behaviour -> Probably because of index number messed up by freshly appearing visibleItems
- Refresh itemIndex after sync for correct keyboard navigation
- Handle items with invalid date and no pubDate whatsoever in source xml
- Navigation correction: ensure scroll: top beforenavigate also works on main feed
- Bug where syncing data -> updating feed while SubsMenu is open would cause a jumpscroll and glitch.

### LATER

- Shuffle feed (see below)
- i18n
- Save subscribed rss channels to a global database - Track popularity
- Privacy notice - About page
- Buy me a coffee/Patreon
- Google analytics
- OPML compatibility
- Enhance first landing page - easily add first rss channels.
- LARGE RSS COMPATIBILITY TESTING (see below collected problems)
- Add api rate limiting
- Domain checking and validation ('extractdomain') refactor and enhancment
- Handle old item deletion
- 'Add new' sub -> Possibility to choos from D1 channels
- Implement 'RSS Feed Finder' - If not valid xml URL, but valid page, try to find any rss link on the website and propose to user.
- Create sharable link to import RSS collection (D1 db) - CONSTRAINTS: subbed to at least 5 channels -> cross-check with d1 to check if valid channels (to avoid
  manipulation of IDB before share) -> CHECK IF COLLECTIONS NAMES AREN'T TO LONG AND ALL OF KINDS OF STUFF LIKE THAT

- Handle slow import in UI. Load list of channels, and then let user select/customize channel list before import
- Enhance "looks like you're new here landing page.
- Check items if paywalled (? - this probably needs to fetch each item content)
- Separate youtube, blog, news, podcasts sections in channel lists
- Implement deletions of oldest (and not saved) items
- Handle feeds with no or invalid pubDate - add date '0'/current when importing?
- Suggestion: Add items that where fetched directly, channel by channel to the feed, not in a batch

## Misc

- Daily chess puzzle (Lichess)
- Daily gospel (scraped)
- Daily art
- Random Wikipedia articles feed
- Today in history (wiki)
- Reddit RSS
- Podcast and media player implementation
- Disable YT shorts

### Shuffle algorithm ideas

- Shouldn't be totally random. Fresher contents still at the top. Limit how many consecutive from same channel - Burst suppression - (limit n items per source within X items).
- Prevent 'loud sources' to spam the feed. Consider 'slower' feeds. Round-robin between sources.
- Varying between item types (when videos, podcasts will be implemented).
- When showing items that were previously displayed, consider 'timesDisplayed' or 'msDisplayed' when sorting
  Precompute shuffle key for a few 1000 items in the working set.
- If random+mobile, new shuffle on swipe up (refresh)
- Add timesDisplayed property to items - when active in viewport for mor than 1s ( or how much?)

## RSS reader problems

- When subscibing to: https://feeds.content.dowjones.io/public/rss/RSSOpinion 401 error
- There clearly is a https://s.wsj.net/media/wsj_apple-touch-icon-180x180.png in source code.
- Enhance Description parser: https://www.nme.com/feed gives html/MD text, http://feeds.feedburner.com/Archeyes give incorrect text.
