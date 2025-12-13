export function normalizeText(text: string | undefined | null): string {
	if (!text) return '';
	return text
		.toString()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

export function searchItem(item: any, query: string): boolean {
	const normalizedQuery = normalizeText(query);
	if (!normalizedQuery) return true;

	return item._searchTokens.includes(normalizedQuery);
}
