import type { MatchContext } from "../types";

/**
 * @title {{{.}}}
 */
export type Device = "mobile" | "tablet" | "desktop";

/**
 * @title {{#mobile}}Mobile{{/mobile}} {{#tablet}}Tablet{{/tablet}} {{#desktop}}Desktop{{/desktop}}
 */
export interface Props {
	/** @title Mobile */
	mobile?: boolean;
	/** @title Tablet */
	tablet?: boolean;
	/** @title Desktop */
	desktop?: boolean;
}

// backwards compatibility
interface OldProps {
	devices: Device[];
}

/**
 * @title Device
 * @description Target users based on their device type, such as desktop, tablet, or mobile
 * @icon device-mobile
 */
const MatchDevice = ({ mobile, tablet, desktop, ...rest }: Props, { device }: MatchContext) => {
	const devices = (rest as unknown as OldProps)?.devices ?? [];
	if (mobile) devices.push("mobile");
	if (tablet) devices.push("tablet");
	if (desktop) devices.push("desktop");
	return devices.includes(device);
};

export default MatchDevice;

export const cacheable = true;
