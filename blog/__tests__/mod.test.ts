import { configure } from "../mod";

describe("blog module", () => {
	it("returns AppDefinition with name 'blog' and manifest", async () => {
		const app = await configure({}, async () => undefined);
		expect(app.name).toBe("blog");
		expect(app.manifest).toBeDefined();
		expect(app.state).toEqual({});
	});
});
