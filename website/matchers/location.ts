import type { MatchContext } from "../types";
import { haversine } from "../utils/location";

export interface Coordinate {
	latitude: number;
	longitude: number;
	radius?: number;
}

/**
 * A rule that matches by a circular area (haversine radius).
 *
 * @title Map
 */
export interface Map {
	/**
	 * @title Mode
	 * @default map
	 * @description Match users inside a circular area on the map.
	 */
	type: "map";
	/**
	 * @title Area selection
	 * @format map
	 * @example -7.27820,-35.97630,2000
	 * @description "latitude,longitude,radius_in_meters" for haversine-radius matching.
	 */
	coordinates: string;
}

/**
 * A rule that matches by Cloudflare geo headers (country / region / city).
 *
 * @title Location
 * @format location
 */
export interface Location {
	/**
	 * @title Mode
	 * @default location
	 * @description Match users by country, region and city.
	 */
	type: "location";
	/**
	 * @title City
	 * @example São Paulo
	 * @description Exact city name (case-insensitive) as returned by Cloudflare's cf-ipcity header.
	 */
	city?: string;
	/**
	 * @title Region Code
	 * @example SP
	 * @description Matches Cloudflare's cf-region-code header — usually the ISO 3166-2 subdivision code (SP, RJ, MG, …); some regions return numeric codes. Full names like "São Paulo" are NOT matched.
	 */
	regionCode?: string;
	/**
	 * @title Country
	 * @example BR
	 * @description ISO 3166-1 alpha-2 code (BR, US, AR, …) as returned by Cloudflare's cf-ipcountry header.
	 */
	country?: string;
}

export interface Props {
	/** @title Include Locations */
	includeLocations?: (Location | Map)[];
	/** @title Exclude Locations */
	excludeLocations?: (Location | Map)[];
}

export interface MapLocation {
	city?: string;
	regionCode?: string;
	country?: string;
	coordinates?: string;
}

const matchLocation =
	(defaultNotMatched = true, source: MapLocation) =>
	(target: MapLocation) => {
		if (!target.regionCode && !target.city && !target.country && !target.coordinates) {
			return defaultNotMatched;
		}
		let result = !target.regionCode || target.regionCode === source.regionCode;
		result &&=
			!source.coordinates ||
			!target.coordinates ||
			haversine(source.coordinates, target.coordinates) <= Number(target.coordinates.split(",")[2]);
		result &&= !target.city || target.city === source.city;
		result &&= !target.country || target.country === source.country;
		return result;
	};

function fixEncoding(input: string): string {
	try {
		const utf8bytes = [...input].map((char) => char.charCodeAt(0));
		return new TextDecoder("utf-8").decode(Uint8Array.from(utf8bytes));
	} catch {
		return input;
	}
}

const escaped = ({ city, country, regionCode, coordinates }: MapLocation): MapLocation => {
	return {
		coordinates,
		regionCode,
		city: city ? fixEncoding(city) : city,
		country: country ? fixEncoding(country) : country,
	};
};

/**
 * @title Location
 * @description Target users based on their geographical location, such as country, city, or region
 * @icon map-2
 */
export default function MatchLocation(
	{ includeLocations, excludeLocations }: Props,
	{ request }: MatchContext,
) {
	const city = request.headers.get("cf-ipcity") ?? undefined;
	const country = request.headers.get("cf-ipcountry") ?? undefined;
	const regionCode = request.headers.get("cf-region-code") ?? undefined;
	const latitude = request.headers.get("cf-iplatitude") ?? undefined;
	const longitude = request.headers.get("cf-iplongitude") ?? undefined;
	const coordinates = latitude ? `${latitude},${longitude}` : undefined;

	const userLocation = { city, country, regionCode, coordinates };
	const isLocationExcluded =
		excludeLocations?.some(matchLocation(false, escaped(userLocation))) ?? false;

	if (isLocationExcluded) {
		return false;
	}

	if (includeLocations?.length === 0) {
		return true;
	}

	return includeLocations?.some(matchLocation(true, escaped(userLocation))) ?? true;
}
