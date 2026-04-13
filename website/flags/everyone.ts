import MatchAlways from "../matchers/always";
import type { FlagObj } from "../types";
import Audience, { type Route, type Routes } from "./audience";

export interface EveryoneConfig {
	routes?: Routes;
}

/**
 * @title Audience Everyone
 * @description Always match regardless of the current user
 */
export default function Everyone({ routes }: EveryoneConfig): FlagObj<Route[]> {
	return Audience({
		matcher: MatchAlways,
		routes: routes ?? [],
		name: "Everyone",
	});
}
