export function detectDevice() {
	const userAgent =
		navigator.userAgent || navigator.vendor || (window as any).opera;

	if (/android/i.test(userAgent)) {
		return "Mobile";
	}

	if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
		return "Mobile";
	}

	if (/Macintosh|Windows|Linux/.test(userAgent)) {
		return "Desktop";
	}

	return "Unknown";
}
