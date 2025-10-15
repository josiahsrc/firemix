import { deleteField as clientDeleteField } from "firebase/firestore";
import { clientF2B } from "./client";

describe("clientF2B", () => {
	it("converts field values", () => {
		expect(clientF2B(clientDeleteField())).toEqual({
			_methodName: "deleteField",
		});
	});
});
