import type { DBSchema } from 'idb';

export interface SubscribeRequestBody {
	url?: string;
	urls?: string[];
}

export interface NormalizedRSSChannel {
	title: string;
	description: string;
	link: string;
	language?: string;
	pubDate?: string;
	lastBuildDate?: string;
	image?: string;
}

export interface YouTubeMetadata {
	videoId: string;
	channelId: string;
	isShort: boolean;
	thumbnails: {
		default?: string;
		medium?: string;
		high?: string;
	};
}

export interface NormalizedRSSItem {
	title: string;
	description: string;
	link: string;
	pubDate: string;
	author?: string;
	category?: string | string[];
	image?: string;
	guid?: string;
	type: 'article' | 'video' | 'short';
	youtube?: YouTubeMetadata;
}

export interface NormalizedRSSFeed {
	data: NormalizedRSSChannel;
	items: NormalizedRSSItem[];
}

export interface RSSFeedSuccessResponse {
	success: true;
	data: NormalizedRSSFeed;
	sourceUrl: string;
	feedUrl: string;
}

export interface RSSFeedErrorResponse {
	success: false;
	error: string;
}

export type RSSFeedResponse = RSSFeedSuccessResponse | RSSFeedErrorResponse;

export interface DBCollection {
	id: string;
	name: string;
	createdAt: number;
}

export interface DBChannel extends NormalizedRSSChannel {
	savedAt: number;
	feedUrl: string;
	collectionIds: string[];
	hideOnMainFeed: boolean;
	customTitle?: string;
}

export interface DBItem extends NormalizedRSSItem {
	id: string;
	channelId: string;
	savedAt: number;
	timestamp: number;
	read: boolean;
	closed: boolean;
	favourite: 1 | 0;
	_searchTokens: string;
}

export interface RSSDatabase extends DBSchema {
	channels: {
		key: string;
		value: DBChannel;
	};
	items: {
		key: string;
		value: DBItem;
		indexes: {
			'by-channel': string;
			'by-date': string;
			'by-channel-date': [string, number];
			'by-fav-date': [number, number];
		};
	};
	collections: {
		key: string;
		value: DBCollection;
	};
}

export interface UIItem extends DBItem {
	channelTitle?: string;
	channelImage?: string;
}
