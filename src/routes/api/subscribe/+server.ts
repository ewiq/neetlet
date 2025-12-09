import type { NormalizedRSSFeed, NormalizedRSSItem } from '$lib/types/rss';
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

function extractDomain(url: string): string {
	try {
		const urlObj = new URL(url);
		let hostname = urlObj.hostname;

		if (hostname.startsWith('www.')) {
			hostname = hostname.substring(4);
			console.log(hostname);
		}

		return 'https://www.' + hostname;
	} catch {
		return '';
	}
}

function isValidUrl(urlString: string): boolean {
	try {
		const url = new URL(urlString);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

function isValidXML(xmlText: string): boolean {
	if (!xmlText.trim().startsWith('<')) return false;
	const hasXmlDeclaration = xmlText.includes('<?xml');
	const hasRssTag =
		xmlText.includes('<rss') || xmlText.includes('<feed') || xmlText.includes('<rdf:RDF');
	return hasXmlDeclaration || hasRssTag;
}

function isValidRSSStructure(parsedData: any): { valid: boolean; error?: string } {
	if (parsedData.rss) {
		if (!parsedData.rss.channel)
			return { valid: false, error: 'RSS feed missing required <channel> element' };
		const channel = parsedData.rss.channel;
		if (!channel.title || !channel.link)
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

function validateContentType(contentType: string | null): { valid: boolean; error?: string } {
	if (!contentType) return { valid: true };
	const validTypes = [
		'application/rss+xml',
		'application/xml',
		'text/xml',
		'application/atom+xml',
		'application/rdf+xml',
		'text/plain'
	];
	const lowerContentType = contentType.toLowerCase();
	if (!validTypes.some((type) => lowerContentType.includes(type))) {
		return {
			valid: false,
			error: `Invalid content type: ${contentType}. Expected RSS/XML content.`
		};
	}
	return { valid: true };
}

// --- Image Extraction Logic (Preserved as requested) ---

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
					type: 'article' // Default to article for standard feeds
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

// --- Handler ---

export const POST: RequestHandler = async ({ request }) => {
	try {
		let { url } = await request.json();

		if (!url) return json({ success: false, error: 'URL is required' }, { status: 400 });
		if (!isValidUrl(url))
			return json({ success: false, error: 'Invalid URL format.' }, { status: 400 });

		// Handle YouTube
		if (isYouTubeUrl(url)) {
			if (isYouTubeChannelUrl(url)) {
				try {
					const channelId = await extractYouTubeChannelId(url);
					if (!channelId)
						return json(
							{ success: false, error: 'Could not extract YouTube channel ID' },
							{ status: 400 }
						);
					url = getYouTubeRSSUrl(channelId);
				} catch (error: any) {
					console.error('Error extracting YouTube ID:', error);
					return json(
						{ success: false, error: `Failed to process YouTube URL: ${error.message}` },
						{ status: 400 }
					);
				}
			} else if (!url.includes('feeds/videos.xml')) {
				return json(
					{ success: false, error: 'Please provide a YouTube channel URL or RSS feed URL' },
					{ status: 400 }
				);
			}
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000);

		let response: Response;
		try {
			response = await fetch(url, {
				signal: controller.signal,
				headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader/1.0)' }
			});
		} catch (fetchError: any) {
			clearTimeout(timeoutId);
			if (fetchError.name === 'AbortError')
				return json({ success: false, error: 'Request timeout' }, { status: 504 });
			return json(
				{ success: false, error: `Failed to fetch URL: ${fetchError.message}` },
				{ status: 502 }
			);
		}
		clearTimeout(timeoutId);

		if (!response.ok)
			return json(
				{ success: false, error: `Failed to fetch: ${response.status} ${response.statusText}` },
				{ status: response.status }
			);

		const contentTypeValidation = validateContentType(response.headers.get('content-type'));
		if (!contentTypeValidation.valid)
			return json({ success: false, error: contentTypeValidation.error }, { status: 400 });

		const xmlText = await response.text();
		if (!xmlText || xmlText.trim().length === 0)
			return json({ success: false, error: 'RSS feed empty' }, { status: 400 });
		if (!isValidXML(xmlText))
			return json({ success: false, error: 'Invalid XML format' }, { status: 400 });

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

		let parsedResult: any;
		try {
			parsedResult = parser.parse(xmlText);
		} catch (parseError: any) {
			return json(
				{ success: false, error: `XML parsing failed: ${parseError.message}` },
				{ status: 400 }
			);
		}

		let normalizedFeed: NormalizedRSSFeed;
		if (url.includes('youtube.com/feeds/videos.xml')) {
			try {
				normalizedFeed = normalizeYouTubeFeed(parsedResult);
			} catch (error: any) {
				return json(
					{ success: false, error: `Failed to parse YouTube feed: ${error.message}` },
					{ status: 400 }
				);
			}
		} else {
			const structureValidation = isValidRSSStructure(parsedResult);
			if (!structureValidation.valid)
				return json({ success: false, error: structureValidation.error }, { status: 400 });
			normalizedFeed = normalizeRSSFeed(parsedResult);
		}

		// Image fallback
		if (!normalizedFeed.data.image && normalizedFeed.data.link) {
			try {
				const websiteUrl = extractDomain(normalizedFeed.data.link);
				const fallbackIcon = await fetchWebpageIcon(websiteUrl);
				if (fallbackIcon) {
					normalizedFeed.data.image = fallbackIcon;
				}
			} catch (iconError) {
				console.warn('Icon fallback fetch failed', iconError);
			}
		}

		if (!normalizedFeed.data.title && !normalizedFeed.data.link) {
			return json({ success: false, error: 'Feed missing minimum data' }, { status: 400 });
		}

		return json({
			success: true,
			data: normalizedFeed,
			sourceUrl: url
		});
	} catch (error) {
		console.error('Error processing RSS feed:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
