import { b2f, recursiveConvert } from "./base";
import {
	Timestamp as ClientTimestamp,
	deleteField as clientDeleteField,
} from "firebase/firestore";
import { clientF2B } from "./client";
import { blaze, setBlazeSdk } from "./strategy.all";

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

describe("b2f", () => {
	it("converts field values", () => {
		setBlazeSdk("client");

		expect(b2f(blaze().deleteField())).toEqual({ _methodName: "deleteField" });
		expect(b2f(blaze().arrayRemove(42))).toEqual({
			_methodName: "arrayRemove",
			_elements: [42],
		});
		expect(b2f(blaze().arrayUnion(42))).toEqual({
			_methodName: "arrayUnion",
			_elements: [42],
		});
		expect(b2f(blaze().serverTimestamp())).toEqual({
			_methodName: "serverTimestamp",
		});

		const date = new Date(2021, 1, 1);
		expect(b2f(blaze().timestampFromDate(date))).toEqual(
			ClientTimestamp.fromDate(date)
		);

		const nestedDateObj = { a: { b: blaze().timestampFromDate(date) } };
		expect(b2f(nestedDateObj)).toEqual({
			a: { b: ClientTimestamp.fromDate(date) },
		});

		const superNestedDateObj = { a: [{ b: blaze().timestampFromDate(date) }] };
		expect(b2f(superNestedDateObj)).toEqual({
			a: [{ b: ClientTimestamp.fromDate(date) }],
		});

		const ultimateTestObj = {
			a: 1,
			b: 2,
			c: {
				delete: blaze().deleteField(),
				arrayUnion: blaze().arrayUnion(42),
				arrayRemove: blaze().arrayRemove(42),
				serverTimestamp: blaze().serverTimestamp(),
				z: [1, 2, 3],
			},
		};
		expect(b2f(ultimateTestObj)).toEqual({
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

describe("clientF2B", () => {
	it("converts field values", () => {
		expect(clientF2B(clientDeleteField())).toEqual({
			_methodName: "deleteField",
		});
	});
});
