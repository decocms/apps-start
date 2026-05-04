/**
 * OneDollarStats — deco's lightweight in-house analytics.
 *
 * Pings the lilstts collector with pageviews (initial load + SPA navigations)
 * and forwards custom DECO events as `stonks.event(name, params)`.
 *
 * Mount in the site's `__root.tsx` as a child of `DecoRootLayout`:
 *
 * ```tsx
 * <DecoRootLayout … >
 *   <OneDollarStats />
 * </DecoRootLayout>
 * ```
 *
 * No CMS wiring is needed — the component is env-gated and self-mounting.
 *
 * Behavioral notes vs the Fresh deco-cx/apps OneDollarStats:
 *   - The initial pageview fires unconditionally (mirrors the Path B
 *     `analytics/loaders/OneDollarScript.ts` script-loader from Fresh).
 *     The Fresh component variant relied on a synthesised `{ name: "deco" }`
 *     event from `Events.tsx`'s subscribe-replay, which has no equivalent
 *     in TanStack — so we do not depend on it.
 *   - Flag enrichment continues to work via client-side parsing of the
 *     `deco_segment` cookie (same code path as the script-loader version).
 *   - `pageId` enrichment is intentionally dropped — no deco-admin dashboard
 *     consumes it. Add later if a flag-segmented dashboard needs it.
 */

declare global {
	interface Window {
		stonks?: {
			view?: (params: Record<string, string | boolean>) => void;
			event?: (name: string, params: Record<string, string | boolean>) => void;
		};
	}
}

export interface Props {
	/** lilstts collector URL. Defaults to {@link DEFAULT_COLLECTOR_ADDRESS}. */
	collectorAddress?: string;
	/** lilstts static script URL. Defaults to {@link DEFAULT_ANALYTICS_SCRIPT_URL}. */
	staticScriptUrl?: string;
}

export const DEFAULT_COLLECTOR_ADDRESS = "https://d.lilstts.com/events";
export const DEFAULT_ANALYTICS_SCRIPT_URL = "https://s.lilstts.com/deco.js";

/**
 * `false` when `ONEDOLLAR_ENABLED=false` is set on the Worker. Default: enabled.
 * Matches the Fresh-side Deno env contract.
 */
const ONEDOLLAR_ENABLED = process.env.ONEDOLLAR_ENABLED !== "false";
const ONEDOLLAR_COLLECTOR = process.env.ONEDOLLAR_COLLECTOR;
const ONEDOLLAR_STATIC_SCRIPT = process.env.ONEDOLLAR_STATIC_SCRIPT;

/**
 * Inline subscriber snippet — kept as a plain string constant (not a
 * `useScript(fn)` serialisation) because `fn.toString()` produces different
 * output in SSR vs client Vite builds under React Compiler, causing
 * hydration mismatches on `dangerouslySetInnerHTML`. See
 * `@decocms/start/sdk/useScript` for the deprecation note.
 *
 * Mirrors the Path B (`analytics/loaders/OneDollarScript.ts`) snippet from
 * deco-cx/apps: parse `deco_segment` cookie for flags, fire first pageview
 * unconditionally, patch `history.pushState` + `popstate` for SPA navs,
 * subscribe to `window.DECO.events` to forward non-`deco` events.
 */
const ONEDOLLAR_SNIPPET = `(function(){
	function parseCookies(str){
		var out = {};
		str.split(";").forEach(function(c){
			var idx = c.indexOf("=");
			if (idx < 0) return;
			out[c.slice(0, idx).trim()] = c.slice(idx + 1).trim();
		});
		return out;
	}
	function tryOrDefault(fn, d){ try { return fn(); } catch(e) { return d; } }
	function getFlags(cookies){
		var out = [];
		var raw = cookies["deco_segment"];
		var seg = raw ? tryOrDefault(function(){ return JSON.parse(decodeURIComponent(atob(raw))); }, {}) : {};
		(seg.active || []).forEach(function(name){ out.push({ name: name, value: true }); });
		(seg.inactiveDrawn || []).forEach(function(name){ out.push({ name: name, value: false }); });
		return out;
	}
	function truncate(v){ return ("" + v).slice(0, 990); }
	var flagList = getFlags(parseCookies(document.cookie || ""));
	var flags = {};
	flagList.forEach(function(f){ flags[f.name] = f.value; });
	function trackPageview(){
		if (window.stonks && typeof window.stonks.view === "function") {
			window.stonks.view(flags);
		}
	}
	trackPageview();
	var origPush = history.pushState;
	if (origPush) {
		history.pushState = function(){
			origPush.apply(this, arguments);
			trackPageview();
		};
		addEventListener("popstate", trackPageview);
	}
	if (window.DECO && window.DECO.events && typeof window.DECO.events.subscribe === "function") {
		window.DECO.events.subscribe(function(event){
			if (!event || !event.name || event.name === "deco") return;
			var values = {};
			for (var k in flags) values[k] = flags[k];
			var params = event.params || {};
			for (var key in params) {
				var v = params[key];
				if (v !== null && v !== undefined) {
					values[key] = truncate(typeof v !== "object" ? v : JSON.stringify(v));
				}
			}
			if (window.stonks && typeof window.stonks.event === "function") {
				window.stonks.event(event.name, values);
			}
		});
	}
})();`;

function OneDollarStats({ collectorAddress, staticScriptUrl }: Props) {
	if (!ONEDOLLAR_ENABLED) return null;

	const collector = collectorAddress ?? ONEDOLLAR_COLLECTOR ?? DEFAULT_COLLECTOR_ADDRESS;
	const staticScript = staticScriptUrl ?? ONEDOLLAR_STATIC_SCRIPT ?? DEFAULT_ANALYTICS_SCRIPT_URL;

	return (
		<>
			<link rel="dns-prefetch" href={collector} />
			<link rel="preconnect" href={collector} crossOrigin="anonymous" />
			<script
				id="tracker"
				data-autocollect="false"
				data-hash-routing="true"
				data-url={collector}
				src={staticScript}
			/>
			<script defer dangerouslySetInnerHTML={{ __html: ONEDOLLAR_SNIPPET }} />
		</>
	);
}

export default OneDollarStats;
