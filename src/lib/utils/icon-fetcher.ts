import { parse } from 'node-html-parser';

export async function fetchWebpageIcon(websiteUrl: string): Promise<string | undefined> {
	if (!websiteUrl) return undefined;

	console.log(websiteUrl);
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000);

		const response = await fetch(websiteUrl, {
			signal: controller.signal,
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader/1.0)'
			}
		});
		clearTimeout(timeoutId);

		if (!response.ok) return undefined;

		const html = await response.text();
		const root = parse(html);

		let icon = root.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href');

		if (!icon) {
			icon =
				root.querySelector('link[rel="icon"]')?.getAttribute('href') ||
				root.querySelector('link[rel="shortcut icon"]')?.getAttribute('href');
		}

		if (!icon) {
			icon = root.querySelector('meta[property="og:image"]')?.getAttribute('content');
		}

		if (icon) {
			if (icon.startsWith('http')) return icon;
			if (icon.startsWith('//')) return `https:${icon}`;

			try {
				const baseUrl = new URL(websiteUrl);
				if (icon.startsWith('/')) {
					return `${baseUrl.origin}${icon}`;
				} else {
					return `${baseUrl.origin}${baseUrl.pathname.endsWith('/') ? '' : '/'}${icon}`;
				}
			} catch (e) {
				return undefined;
			}
		}

		// 5. Last resort: Try default favicon.ico at root
		// We return undefined here to let the frontend handle a generic placeholder,
		// or you could check if /favicon.ico exists.
		return undefined;
	} catch (error) {
		console.warn(`Failed to fetch icon for ${websiteUrl}:`, error);
		return undefined;
	}
}
