export function formatDateTime(date: Date) {
	const year = date.getFullYear();
	const month = date.toLocaleDateString('en-US', { month: 'long' });
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	return { year, month, hours, minutes };
}

export function timeAgo(date: Date, now: Date) {
	const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
	return date.toLocaleDateString();
}
