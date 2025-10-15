import { firemixToFirestore, recursiveConvert } from "../src";
import {
	Timestamp as ClientTimestamp,
	deleteField as clientDeleteField,
} from "firebase/firestore";
import { FiremixClient, clientFirestoreToFiremix } from "@firemix/client";

describe("recursiveConvert", () => {
	const convert = (obj: any) => {
		return recursiveConvert(obj, (value) => {
			if (value === 420) {
				return [true, 69];
			}

			return [false, value];
		});
	};

	it("works for undefined", () => {
		expect(convert(undefined)).toBe(undefined);
	});

	it("works for null", () => {
		expect(convert(null)).toBe(null);
	});

	it("works for boolean", () => {
		expect(convert(true)).toBe(true);
	});

	it("works for number", () => {
		expect(convert(42)).toBe(42);
	});

	it("works for string", () => {
		expect(convert("hello")).toBe("hello");
	});

	it("works for object", () => {
		expect(convert({})).toEqual({});
	});
});

describe("firemixToFirestore", () => {
	it("converts field values", () => {
		const firemix = new FiremixClient();

		expect(firemixToFirestore(firemix.deleteField())).toEqual({ _methodName: "deleteField" });
		expect(firemixToFirestore(firemix.arrayRemove(42))).toEqual({
			_methodName: "arrayRemove",
			_elements: [42],
		});
		expect(firemixToFirestore(firemix.arrayUnion(42))).toEqual({
			_methodName: "arrayUnion",
			_elements: [42],
		});
		expect(firemixToFirestore(firemix.serverTimestamp())).toEqual({
			_methodName: "serverTimestamp",
		});

		const date = new Date(2021, 1, 1);
		expect(firemixToFirestore(firemix.timestampFromDate(date))).toEqual(
			ClientTimestamp.fromDate(date)
		);

		const nestedDateObj = { a: { b: firemix.timestampFromDate(date) } };
		expect(firemixToFirestore(nestedDateObj)).toEqual({
			a: { b: ClientTimestamp.fromDate(date) },
		});

		const superNestedDateObj = { a: [{ b: firemix.timestampFromDate(date) }] };
		expect(firemixToFirestore(superNestedDateObj)).toEqual({
			a: [{ b: ClientTimestamp.fromDate(date) }],
		});

		const ultimateTestObj = {
			a: 1,
			b: 2,
			c: {
				delete: firemix.deleteField(),
				arrayUnion: firemix.arrayUnion(42),
				arrayRemove: firemix.arrayRemove(42),
				serverTimestamp: firemix.serverTimestamp(),
				z: [1, 2, 3],
			},
		};
		expect(firemixToFirestore(ultimateTestObj)).toEqual({
			a: 1,
			b: 2,
			c: {
				delete: { _methodName: "deleteField" },
				arrayUnion: { _methodName: "arrayUnion", _elements: [42] },
				arrayRemove: { _methodName: "arrayRemove", _elements: [42] },
				serverTimestamp: { _methodName: "serverTimestamp" },
				z: [1, 2, 3],
			},
		});
	});
});

describe("clientFirestoreToFiremix", () => {
	it("converts field values", () => {
		expect(clientFirestoreToFiremix(clientDeleteField())).toEqual({
			_methodName: "deleteField",
		});
	});
});
