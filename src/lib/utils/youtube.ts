import { channelId } from '@gonetone/get-youtube-id-by-url';
import type { NormalizedRSSFeed, NormalizedRSSItem, YouTubeMetadata } from '$lib/types/rss';
import { extractCategories, extractLink, extractText } from './rss-helpers';

export function isYouTubeUrl(url: string): boolean {
	return url.includes('youtube.com') || url.includes('youtu.be');
}

export function isYouTubeChannelUrl(url: string): boolean {
	const patterns = [
		/youtube\.com\/channel\/[^/]+/,
		/youtube\.com\/c\/[^/]+/,
		/youtube\.com\/user\/[^/]+/,
		/youtube\.com\/@[^/]+/
	];
	return patterns.some((pattern) => pattern.test(url));
}

export function isYouTubeShort(link: string): boolean {
	return link.includes('/shorts/');
}

export async function extractYouTubeChannelId(url: string): Promise<string | null> {
	try {
		const id = await channelId(url);
		return id;
	} catch (error) {
		console.warn('Failed to extract channel ID with package:', error);

		// Manual pattern matching fallback
		const patterns = [
			/youtube\.com\/channel\/([^/?&]+)/,
			/youtube\.com\/c\/([^/?&]+)/,
			/youtube\.com\/user\/([^/?&]+)/,
			/youtube\.com\/@([^/?&]+)/
		];

		for (const pattern of patterns) {
			const match = url.match(pattern);
			if (match && match[1]) {
				if (pattern.toString().includes('@')) {
					return await fetchChannelIdFromHandle(match[1]);
				}
				return match[1];
			}
		}
		return null;
	}
}

async function fetchChannelIdFromHandle(handle: string): Promise<string | null> {
	try {
		const url = `https://www.youtube.com/@${handle}`;
		const response = await fetch(url, {
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader/1.0)' }
		});
		const html = await response.text();

		const patterns = [
			/"channelId":"([^"]+)"/,
			/"externalId":"([^"]+)"/,
			/<meta[^>]+content="https:\/\/www\.youtube\.com\/channel\/([^"]+)"[^>]*>/,
			/youtube\.com\/channel\/(UC[\w-]{22})/
		];

		for (const pattern of patterns) {
			const match = html.match(pattern);
			if (match && match[1]) return match[1];
		}
		return null;
	} catch (error) {
		console.error('Failed to fetch channel ID from handle:', error);
		return null;
	}
}

export function getYouTubeRSSUrl(channelId: string): string {
	return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

// --- Normalization Logic ---

export function normalizeYouTubeFeed(parsedData: any): NormalizedRSSFeed {
	const feed = parsedData.feed;
	if (!feed) throw new Error('Invalid YouTube RSS feed format');

	const items = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];

	return {
		data: {
			title: extractText(feed.title),
			description: extractText(feed.subtitle || feed.description),
			link: extractLink(feed.link),
			language: extractText(feed.language),
			pubDate: extractText(feed.published || feed.updated),
			lastBuildDate: extractText(feed.updated),
			image: extractYouTubeImageUrl(feed)
		},
		items: items.map((entry: any) => normalizeYouTubeEntry(entry))
	};
}

function normalizeYouTubeEntry(entry: any): NormalizedRSSItem {
	const mediaGroup = entry['media:group'];
	const videoId = entry['yt:videoId'];
	const channelId = entry['yt:channelId'];
	const link = extractLink(entry.link);
	const isShort = isYouTubeShort(link);

	// Extract Description specifically for YouTube
	const description = mediaGroup?.['media:description']
		? extractText(mediaGroup['media:description'])
		: '';

	const thumbnails = extractYouTubeThumbnails(mediaGroup);
	// Use high res thumb for main image, fall back to others
	const mainImage = thumbnails.high || thumbnails.medium || thumbnails.default;

	const youtubeMetadata: YouTubeMetadata = {
		videoId: videoId,
		channelId: channelId,
		thumbnails: thumbnails,
		isShort: isShort
	};

	return {
		title: extractText(entry.title),
		description: description,
		link: link,
		pubDate: extractText(entry.published || entry.updated),
		author: extractText(entry.author?.name),
		category: extractCategories(entry),
		image: mainImage,
		guid: extractText(entry.id),
		// CRITICAL: Distinguish between Short and Video
		type: isShort ? 'short' : 'video',
		youtube: youtubeMetadata
	};
}

// --- Internal Extraction Helpers ---

function extractYouTubeImageUrl(feed: any): string | undefined {
	return feed['media:thumbnail']?.['@_url'];
}

function extractYouTubeThumbnails(mediaGroup: any) {
	const thumbnails: any = {
		default: undefined,
		medium: undefined,
		high: undefined
	};

	if (!mediaGroup) return thumbnails;

	const thumbnail = mediaGroup['media:thumbnail'];
	if (thumbnail) {
		if (Array.isArray(thumbnail)) {
			thumbnail.forEach((thumb: any) => {
				const width = thumb['@_width'];
				if (width === '480') thumbnails.high = thumb['@_url'];
				else if (width === '320') thumbnails.medium = thumb['@_url'];
				else if (width === '120' || !width) thumbnails.default = thumb['@_url'];
			});
		} else if (thumbnail['@_url']) {
			thumbnails.default = thumbnail['@_url'];
		}
	}
	return thumbnails;
}
