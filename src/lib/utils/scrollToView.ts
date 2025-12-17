export function scrollToView(node: HTMLElement) {
	const timeouts: NodeJS.Timeout[] = [];
	const scrollAttempts = [100, 200, 400, 600, 800];

	scrollAttempts.forEach((delay) => {
		const timeout = setTimeout(() => {
			node.scrollIntoView({
				behavior: 'smooth',
				block: 'center'
			});
		}, delay);
		timeouts.push(timeout);
	});

	return {
		destroy() {
			timeouts.forEach((timeout) => clearTimeout(timeout));
		}
	};
}
