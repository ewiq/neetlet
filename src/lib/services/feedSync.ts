import { getAllChannels, saveFeedToDB } from '$lib/db/db';
import type { RSSFeedResponse } from '$lib/types/rss';

const BATCH_SIZE = 20;

export async function syncAllFeeds() {
	console.log('Starting feed sync...');
	const channels = await getAllChannels();

	if (channels.length === 0) {
		return { count: 0, errors: 0 };
	}

	const urlsToFetch = channels.map((c) => c.feedUrl).filter((url) => !!url);
	if (urlsToFetch.length === 0) {
		throw new Error('No channel URLs found');
	}

	let errorCount = 0;

	const batches = [];
	for (let i = 0; i < urlsToFetch.length; i += BATCH_SIZE) {
		batches.push(urlsToFetch.slice(i, i + BATCH_SIZE));
	}

	// Process batches sequentially
	for (const batch of batches) {
		try {
			const response = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ urls: batch })
			});

			if (!response.ok) {
				console.error('Batch sync failed', response.statusText);
				errorCount += batch.length;
				continue;
			}

			const { results }: { results: RSSFeedResponse[] } = await response.json();

			const savePromises = results.map(async (res) => {
				if (res.success) {
					if (res.data && res.sourceUrl) {
						console.log(`%c${res.data.data.title} : refreshed`, 'color: #10b981');
						await saveFeedToDB(res.data, res.sourceUrl);
					}
				} else {
					console.warn(`%cError syncing feed: ${res.error || 'Unknown error'}`, 'color: #ef4444');
					errorCount++;
				}
			});

			await Promise.all(savePromises);
		} catch (error) {
			console.error('Batch network error:', error);
			errorCount += batch.length;
		}
	}

	console.log(`Sync complete. Errors: ${errorCount}`);
	return { success: true, errors: errorCount };
}
