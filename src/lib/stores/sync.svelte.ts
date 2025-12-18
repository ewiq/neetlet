export const sync = $state({
	isSyncing: false,
	hasNewData: false, // Indicates background sync found new items
	lastSyncTime: 0,

	setSyncing(val: boolean) {
		this.isSyncing = val;
	},

	setHasNewData(val: boolean) {
		this.hasNewData = val;
	}
});
