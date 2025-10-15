import { AdminBlaze } from "./admin";
import { Blaze } from "./base";
import { AsyncLocalStorage } from "async_hooks";
import { ClientBlaze } from "./client";

export type BlazeSdk = "client" | "admin";

const adminBlaze = new AdminBlaze();
const clientBlaze = new ClientBlaze();

let globalSdk: BlazeSdk = "admin";
const zoneSdkStorage = new AsyncLocalStorage<BlazeSdk>();
let zoneSdkEnabled = true;

const getZoneSdk = (): BlazeSdk | undefined => {
	if (!zoneSdkEnabled) return undefined;
	return zoneSdkStorage.getStore();
};

export const setBlazeSdk = (sdk: BlazeSdk): void => {
	globalSdk = sdk;
};

export const blaze = (sdk?: BlazeSdk): Blaze => {
	const effectiveSdk = sdk || getZoneSdk() || globalSdk;
	return effectiveSdk === "admin" ? adminBlaze : clientBlaze;
};

export const blazeSdkZone = async <T = void>(
	sdk: BlazeSdk,
	fn: () => Promise<T>
): Promise<T> => {
	return zoneSdkStorage.run(sdk, fn);
};

export const blazeSdkZoneSync = <T = void>(sdk: BlazeSdk, fn: () => T): T => {
	const oldSdk = globalSdk;
	const oldEnabled = zoneSdkEnabled;
	setBlazeSdk(sdk);
	zoneSdkEnabled = false;
	try {
		return fn();
	} finally {
		setBlazeSdk(oldSdk);
		zoneSdkEnabled = oldEnabled;
	}
};
