import { describe, expect, it } from "vitest";
import { mapLabelledFuzzyToFuzzy } from "./productListingPage";

describe("mapLabelledFuzzyToFuzzy", () => {
	it("maps 'automatic' to 'auto'", () => {
		expect(mapLabelledFuzzyToFuzzy("automatic")).toBe("auto");
	});

	it("maps 'enabled' to '1'", () => {
		expect(mapLabelledFuzzyToFuzzy("enabled")).toBe("1");
	});

	it("maps 'disabled' to '0'", () => {
		expect(mapLabelledFuzzyToFuzzy("disabled")).toBe("0");
	});

	it("returns undefined when no label is provided", () => {
		expect(mapLabelledFuzzyToFuzzy()).toBeUndefined();
		expect(mapLabelledFuzzyToFuzzy(undefined)).toBeUndefined();
	});
});
