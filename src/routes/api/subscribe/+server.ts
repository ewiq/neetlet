import type {
	NormalizedRSSFeed,
	NormalizedRSSItem,
	RSSFeedResponse,
	SubscribeRequestBody
} from '$lib/types/rss';
import {
	extractYouTubeChannelId,
	getYouTubeRSSUrl,
	isYouTubeChannelUrl,
	isYouTubeUrl,
	normalizeYouTubeFeed
} from '$lib/utils/youtube';
import {
	extractCategories,
	extractDescription,
	extractLink,
	extractText
} from '$lib/utils/rss-helpers';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { XMLParser } from 'fast-xml-parser';
import { fetchWebpageIcon } from '$lib/utils/icon-fetcher';

// --- URL Helpers ---

function ensureProtocol(url: string): string {
	// If it starts with http:// or https://, leave it. Otherwise prepend https://
	if (!/^https?:\/\//i.test(url)) {
		return `https://${url}`;
	}
	return url;
}

function toggleWww(urlStr: string): string | null {
	try {
		const url = new URL(urlStr);
		if (url.hostname.startsWith('www.')) {
			// Remove www.
			url.hostname = url.hostname.replace(/^www\./, '');
		} else {
			// Add www.
			url.hostname = `www.${url.hostname}`;
		}
		return url.toString();
	} catch {
		return null;
	}
}

function getWebsiteRoot(link: string): string {
	try {
		const url = new URL(link);
		return url.origin;
	} catch {
		return '';
	}
}

async function isValidImageUrl(url: string): Promise<boolean> {
	if (!url) return false;

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3000);

		const response = await fetch(url, {
			method: 'HEAD',
			signal: controller.signal,
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
			}
		});

		clearTimeout(timeoutId);

		// Some servers return 405 Method Not Allowed for HEAD, try generic check
		if (!response.ok && response.status !== 405) return false;

		const contentType = response.headers.get('content-type');
		return contentType ? contentType.startsWith('image/') : false;
	} catch {
		return false;
	}
}

function isValidXML(xmlText: string): boolean {
	if (!xmlText || !xmlText.trim()) return false;
	const trimmed = xmlText.trim();
	// Allow basic XML starting tags
	if (!trimmed.startsWith('<')) return false;
	const hasXmlDeclaration = trimmed.includes('<?xml');
	const hasRssTag =
		trimmed.includes('<rss') || trimmed.includes('<feed') || trimmed.includes('<rdf:RDF');
	return hasXmlDeclaration || hasRssTag;
}

function isValidRSSStructure(parsedData: any): { valid: boolean; error?: string } {
	if (parsedData.rss) {
		if (!parsedData.rss.channel)
			return { valid: false, error: 'RSS feed missing required <channel> element' };
		const channel = parsedData.rss.channel;
		// Some feeds might be missing title/link but are still readable, but we enforce strictly for now
		if (!channel.title && !channel.link)
			return { valid: false, error: 'RSS channel missing required title or link' };
		return { valid: true };
	}
	if (parsedData.feed) {
		if (!parsedData.feed.title)
			return { valid: false, error: 'Atom feed missing required <title> element' };
		return { valid: true };
	}
	if (parsedData['rdf:RDF']) {
		if (!parsedData['rdf:RDF'].channel)
			return { valid: false, error: 'RDF feed missing required <channel> element' };
		return { valid: true };
	}
	return { valid: false, error: 'Unrecognized feed format. Must be RSS 2.0, Atom, or RDF' };
}

function extractImageUrl(imageData: any): string | undefined {
	if (!imageData) return undefined;
	if (typeof imageData === 'string') return imageData;
	if (imageData.url) return imageData.url;
	if (imageData['@_href']) return imageData['@_href'];
	return undefined;
}

function extractImageFromItem(item: any): string | undefined {
	// Media Content
	if (item['media:content']) {
		const mediaContent = item['media:content'];
		if (mediaContent['@_url']) return mediaContent['@_url'];
		if (Array.isArray(mediaContent)) {
			const imageMedia = mediaContent.find((m: any) => m['@_medium'] === 'image' || m['@_url']);
			if (imageMedia?.['@_url']) return imageMedia['@_url'];
		}
	}
	// Enclosure
	if (item.enclosure && item.enclosure['@_type']?.startsWith('image/')) {
		return item.enclosure['@_url'];
	}
	// Media Thumbnail
	if (item['media:thumbnail']?.['@_url']) {
		return item['media:thumbnail']['@_url'];
	}
	// iTunes
	if (item['itunes:image']?.['@_href']) {
		return item['itunes:image']['@_href'];
	}
	// HTML Description scrape
	if (item.description) {
		const desc = extractText(item.description);
		const imgRegex = /<img[^>]+src="([^">]+)"/i;
		const match = imgRegex.exec(desc);
		if (match?.[1]) return match[1];
	}
	return undefined;
}

// --- Main Normalizer (Standard RSS/Atom) ---
function normalizeRSSFeed(parsedData: any): NormalizedRSSFeed {
	// RSS 2.0
	if (parsedData.rss?.channel) {
		const data = parsedData.rss.channel;
		const items = Array.isArray(data.item) ? data.item : data.item ? [data.item] : [];

		return {
			data: {
				title: extractText(data.title),
				description: extractText(data.description || data['content:encoded']),
				link: extractLink(data.link),
				language: extractText(data.language),
				pubDate: extractText(data.pubDate),
				lastBuildDate: extractText(data.lastBuildDate),
				image: extractImageUrl(data.image)
			},
			items: items.map(
				(item: any): NormalizedRSSItem => ({
					title: extractText(item.title),
					description: extractDescription(item),
					link: extractLink(item.link || item['@_about']),
					pubDate: extractText(item.pubDate || item['dc:date'] || item.published || item.updated),
					author: extractText(item.author || item['dc:creator'] || item['itunes:author']),
					category: extractCategories(item),
					image: extractImageFromItem(item),
					guid: extractText(item.guid) || extractText(item.id),
					type: 'article'
				})
			)
		};
	}

	// Atom
	if (parsedData.feed) {
		const feed = parsedData.feed;
		return {
			data: {
				title: extractText(feed.title),
				description: extractText(feed.subtitle || feed.description),
				link: extractLink(feed.link),
				language: extractText(feed.language),
				pubDate: extractText(feed.published || feed.updated),
				lastBuildDate: extractText(feed.updated),
				image: extractImageUrl(feed.icon || feed.logo)
			},
			items: (Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : []).map(
				(entry: any): NormalizedRSSItem => ({
					title: extractText(entry.title),
					description: extractDescription(entry),
					link: extractLink(entry.link),
					pubDate: extractText(entry.published || entry.updated),
					author: Array.isArray(entry.author)
						? entry.author.map((a: any) => extractText(a.name)).join(', ')
						: extractText(entry.author?.name),
					category: extractCategories(entry),
					image: extractImageFromItem(entry),
					guid: extractText(entry.id),
					type: 'article'
				})
			)
		};
	}

	// RDF
	if (parsedData['rdf:RDF']) {
		const rdf = parsedData['rdf:RDF'];
		const channel = rdf.channel;
		const items = Array.isArray(rdf.item) ? rdf.item : rdf.item ? [rdf.item] : [];
		return {
			data: {
				title: extractText(channel?.title),
				description: extractText(channel?.description),
				link: extractLink(channel?.link),
				language: extractText(channel?.['dc:language']),
				pubDate: extractText(channel?.['dc:date']),
				image: extractImageUrl(channel?.image)
			},
			items: items.map(
				(item: any): NormalizedRSSItem => ({
					title: extractText(item.title),
					description: extractDescription(item),
					link: extractLink(item.link || item['@_about']),
					pubDate: extractText(item['dc:date']),
					author: extractText(item['dc:creator']),
					category: extractCategories(item),
					image: extractImageFromItem(item),
					guid: extractText(item['@_about']),
					type: 'article'
				})
			)
		};
	}

	return {
		data: { title: '', description: '', link: '' },
		items: []
	};
}

// --- Fetch with Retry Logic (Handles WWW toggle) ---
async function fetchWithRetry(
	url: string,
	signal: AbortSignal
): Promise<{ response: Response; effectiveUrl: string }> {
	const headers = {
		'User-Agent':
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
	};

	try {
		// Try original URL
		const response = await fetch(url, { signal, headers });
		return { response, effectiveUrl: url };
	} catch (error: any) {
		// Only retry on DNS errors (ENOTFOUND) or Connection Refused
		if (
			error.cause?.code === 'ENOTFOUND' ||
			error.cause?.code === 'ECONNREFUSED' ||
			error.message.includes('fetch failed')
		) {
			const altUrl = toggleWww(url);
			if (altUrl && altUrl !== url) {
				console.log(`Retrying fetch with alternate URL: ${altUrl}`);
				const response = await fetch(altUrl, { signal, headers });
				return { response, effectiveUrl: altUrl };
			}
		}
		throw error;
	}
}

// --- Helper: Process a Single Feed ---
async function processSingleFeed(inputUrl: string): Promise<RSSFeedResponse> {
	try {
		let url = ensureProtocol(inputUrl); // Normalize plain text urls

		// YouTube Handling
		if (isYouTubeUrl(url)) {
			if (isYouTubeChannelUrl(url)) {
				try {
					const channelId = await extractYouTubeChannelId(url);
					if (!channelId) throw new Error('Could not extract YouTube channel ID');
					url = getYouTubeRSSUrl(channelId);
				} catch (error: any) {
					return { success: false, error: error.message };
				}
			} else if (!url.includes('feeds/videos.xml')) {
				return { success: false, error: 'Invalid YouTube URL' };
			}
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

		let response: Response;
		let effectiveUrl: string;

		try {
			const result = await fetchWithRetry(url, controller.signal);
			response = result.response;
			effectiveUrl = result.effectiveUrl;
		} catch (fetchError: any) {
			clearTimeout(timeoutId);
			return { success: false, error: fetchError.message || 'Network request failed' };
		}
		clearTimeout(timeoutId);

		if (!response.ok) {
			return { success: false, error: `HTTP ${response.status}` };
		}

		const xmlText = await response.text();
		if (!isValidXML(xmlText)) {
			return { success: false, error: 'Invalid XML or Not a Feed' };
		}

		// --- Parsing Configuration ---
		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: '@_',
			allowBooleanAttributes: true,
			parseTagValue: true,
			parseAttributeValue: true,
			trimValues: true,
			ignoreDeclaration: true,
			ignorePiTags: true,
			processEntities: true,
			htmlEntities: true,
			stopNodes: [],
			alwaysCreateTextNode: false,
			isArray: (name: string, jpath: string) => {
				const arrayPaths = [
					'rss.channel.item',
					'rss.channel.item.category',
					'rdf:RDF.item',
					'rdf:RDF.item.category',
					'feed.entry',
					'feed.entry.category'
				];
				return arrayPaths.includes(jpath);
			}
		});

		let parsedResult;
		try {
			parsedResult = parser.parse(xmlText);
		} catch (e: any) {
			return { success: false, error: 'Parse Error' };
		}

		let normalizedFeed: NormalizedRSSFeed;

		if (url.includes('youtube.com/feeds/videos.xml')) {
			try {
				normalizedFeed = normalizeYouTubeFeed(parsedResult);
			} catch (e: any) {
				return { success: false, error: e.message };
			}
		} else {
			const structure = isValidRSSStructure(parsedResult);
			if (!structure.valid)
				return { success: false, error: structure.error || 'Invalid Structure' };
			normalizedFeed = normalizeRSSFeed(parsedResult);
		}

		// --- INVERTED IMAGE LOGIC ---
		// 1. Try to fetch high-quality Icon/Favicon from the Website URL
		let iconFound = false;

		if (normalizedFeed.data.link) {
			try {
				// Use the link found in the RSS feed (usually the website homepage)
				const websiteUrl = normalizedFeed.data.link;
				const fetchedIcon = await fetchWebpageIcon(websiteUrl);

				if (fetchedIcon) {
					normalizedFeed.data.image = fetchedIcon;
					iconFound = true;
				}
			} catch (e) {
				console.warn('Failed to fetch website icon:', e);
			}
		}

		// 2. If no icon found, check the image provided in RSS XML
		if (!iconFound && normalizedFeed.data.image) {
			const isValid = await isValidImageUrl(normalizedFeed.data.image);
			if (!isValid) {
				normalizedFeed.data.image = undefined; // Remove if invalid/404
			}
		}

		return {
			success: true,
			data: normalizedFeed,
			sourceUrl: inputUrl,
			feedUrl: effectiveUrl
		};
	} catch (error: any) {
		return { success: false, error: error.message || 'Unknown Error' };
	}
}

// --- Handler ---
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as SubscribeRequestBody;

	if (body.urls && Array.isArray(body.urls)) {
		const urls = body.urls as string[];
		const results = await Promise.all(urls.map((url) => processSingleFeed(url)));
		return json({ results });
	}

	if (body.url) {
		const result = await processSingleFeed(body.url);
		if (!result.success) {
			return json(result, { status: 400 });
		}
		return json(result);
	}

	return json({ success: false, error: 'Missing url or urls parameter' }, { status: 400 });
};
