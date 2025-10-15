import { deleteField as clientDeleteField } from "firebase/firestore";
import { clientFirestoreToFiremix } from "../src";

describe("clientFirestoreToFiremix", () => {
	it("converts field values", () => {
		expect(clientFirestoreToFiremix(clientDeleteField())).toEqual({
			_methodName: "deleteField",
		});
	});
});
