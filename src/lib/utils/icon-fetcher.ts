import { parse } from 'node-html-parser';

function toggleWww(urlStr: string): string | null {
	try {
		const url = new URL(urlStr);
		if (url.hostname.startsWith('www.')) {
			url.hostname = url.hostname.replace(/^www\./, '');
		} else {
			url.hostname = `www.${url.hostname}`;
		}
		return url.toString();
	} catch {
		return null;
	}
}

async function tryFetchHtml(
	url: string,
	signal: AbortSignal
): Promise<{ ok: boolean; text: string; finalUrl: string } | null> {
	try {
		const response = await fetch(url, {
			signal,
			headers: {
				// Highly realistic browser headers to prevent being served stripped content
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept:
					'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.9',
				'Cache-Control': 'no-cache',
				Pragma: 'no-cache',
				'Sec-Fetch-Dest': 'document',
				'Sec-Fetch-Mode': 'navigate',
				'Sec-Fetch-Site': 'none',
				'Sec-Fetch-User': '?1',
				'Upgrade-Insecure-Requests': '1'
			},
			redirect: 'follow'
		});

		if (!response.ok) return null;
		const text = await response.text();
		return { ok: true, text, finalUrl: response.url };
	} catch (error: any) {
		throw error;
	}
}

// Fallback: Regex extraction when the parser fails on messy HTML
function findIconWithRegex(html: string): string | undefined {
	// Look for link tags with rel containing 'icon' or 'apple-touch-icon'
	// This regex looks for: <link ... rel="...icon..." ... href="..." ... > OR <link ... href="..." ... rel="...icon..." ...>
	const linkRegex =
		/<link[^>]+(?:rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]*href=["']([^"']+)["']|href=["']([^"']+)["'][^>]*rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'])[^>]*>/gi;

	// Also look for og:image
	const ogRegex = /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/gi;

	let match;

	// Priority 1: SVG/PNG Icons
	while ((match = linkRegex.exec(html)) !== null) {
		const href = match[1] || match[2];
		if (href && (href.endsWith('.svg') || href.endsWith('.png') || href.endsWith('.ico'))) {
			return href;
		}
	}

	// Priority 2: OG Image
	while ((match = ogRegex.exec(html)) !== null) {
		if (match[1]) return match[1];
	}

	return undefined;
}

export async function fetchWebpageIcon(websiteUrl: string): Promise<string | undefined> {
	if (!websiteUrl) return undefined;

	let urlToFetch = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;

	// Fix: If url is just "qubit.hu", make sure we don't fetch "https://qubit.hu/feed" if passed incorrectly
	try {
		const u = new URL(urlToFetch);
		// If the path is obviously a feed, try to strip it to get root
		if (u.pathname.endsWith('.xml') || u.pathname.endsWith('/feed') || u.pathname.includes('rss')) {
			urlToFetch = u.origin;
		}
	} catch {}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 8000);

	let html: string = '';
	let finalBaseUrl: string = urlToFetch;

	try {
		// 1. Attempt Fetch (with Retry logic for DNS errors)
		try {
			const result = await tryFetchHtml(urlToFetch, controller.signal);
			if (result) {
				html = result.text;
				finalBaseUrl = result.finalUrl;
			}
		} catch (error: any) {
			const isDnsError =
				error.cause?.code === 'ENOTFOUND' || error.message.includes('fetch failed');
			if (isDnsError) {
				const altUrl = toggleWww(urlToFetch);
				if (altUrl) {
					try {
						const result = await tryFetchHtml(altUrl, controller.signal);
						if (result) {
							html = result.text;
							finalBaseUrl = result.finalUrl;
						}
					} catch {}
				}
			}
		}
	} catch {
		return undefined;
	} finally {
		clearTimeout(timeoutId);
	}

	if (!html) return undefined;

	// 2. PARSE HTML
	let icon: string | undefined;

	// Strategy A: Standard Parser
	try {
		const root = parse(html);
		const selectors = [
			{ selector: 'link[rel="apple-touch-icon"]', attr: 'href' },
			{ selector: 'link[rel="icon"][type="image/svg+xml"]', attr: 'href' },
			{ selector: 'link[rel="icon"]', attr: 'href' },
			{ selector: 'link[rel="shortcut icon"]', attr: 'href' },
			{ selector: 'meta[property="og:image"]', attr: 'content' }
		];

		for (const { selector, attr } of selectors) {
			const element = root.querySelector(selector);
			const value = element?.getAttribute(attr);
			if (value) {
				icon = value;
				break;
			}
		}
	} catch (e) {
		console.warn('HTML Parser failed, trying regex fallback');
	}

	// Strategy B: Regex Fallback (If parser failed or found nothing)
	// This is crucial for Qubit.hu where comments might break the parser
	if (!icon) {
		icon = findIconWithRegex(html);
	}

	// 3. Resolve Relative URLs
	if (icon) {
		if (icon.startsWith('http')) return icon;
		if (icon.startsWith('//')) return `https:${icon}`;

		try {
			const baseUrlObj = new URL(finalBaseUrl);
			if (icon.startsWith('/')) {
				return `${baseUrlObj.origin}${icon}`;
			} else {
				const path = baseUrlObj.pathname.endsWith('/')
					? baseUrlObj.pathname
					: baseUrlObj.pathname.substring(0, baseUrlObj.pathname.lastIndexOf('/') + 1);
				return `${baseUrlObj.origin}${path}${icon}`;
			}
		} catch {
			return undefined;
		}
	}

	// 4. Last Resort: favicon.ico
	try {
		const baseUrlObj = new URL(finalBaseUrl);
		return `${baseUrlObj.origin}/favicon.ico`;
	} catch {
		return undefined;
	}
}
