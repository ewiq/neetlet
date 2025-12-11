### BUGS

- Deduplicate FeedCards From different sources on Main feed.

- Keyboard post navigation has buggy behaviour -> Probably because of index number messed up by freshly appearing visibleItems

- Mobile UI bug - scroll still possible by multiple input open/close

- Ctrl + K and K conflict - Solution: Disable K eventlistener when Ctrl is active?

- Handle items with invalid date and no pubDate whatsoever in source xml

- Navigation correction: ensure scroll: top beforenavigate also works on main feed

- Bug where syncing data -> updating feed while SubsMenu is open would cause a jumpscroll and glitch.
