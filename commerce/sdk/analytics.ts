import type { AnalyticsEvent } from "../types/commerce";

declare global {
	interface Window {
		DECO: { events: { dispatch: (event: any) => void } };
		DECO_SITES_STD: {
			sendAnalyticsEvent: (args: AnalyticsEvent) => void;
		};
	}
}

export const sendEvent = <E extends AnalyticsEvent>(event: E) => {
	if (typeof globalThis.window?.DECO?.events?.dispatch === "function") {
		globalThis.window.DECO.events.dispatch(event);
		return;
	}

	if (typeof globalThis.window?.DECO_SITES_STD?.sendAnalyticsEvent === "function") {
		globalThis.window.DECO_SITES_STD.sendAnalyticsEvent(event);
		return;
	}

	console.info("[analytics] No event dispatcher found. Event not sent:", event.name);
};
