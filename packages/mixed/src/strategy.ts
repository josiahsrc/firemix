import { FiremixAdmin } from "@firemix/admin";
import { Firemix } from "@firemix/core";
import { AsyncLocalStorage } from "async_hooks";
import { FiremixClient } from "@firemix/client";

export type FiremixSdk = "client" | "admin";

const adminFiremix = new FiremixAdmin();
const clientFiremix = new FiremixClient();

let globalSdk: FiremixSdk = "admin";
const zoneSdkStorage = new AsyncLocalStorage<FiremixSdk>();
let zoneSdkEnabled = true;

const getZoneSdk = (): FiremixSdk | undefined => {
	if (!zoneSdkEnabled) return undefined;
	return zoneSdkStorage.getStore();
};

export const setFiremixSdk = (sdk: FiremixSdk): void => {
	globalSdk = sdk;
};

export const firemix = (sdk?: FiremixSdk): Firemix => {
	const effectiveSdk = sdk || getZoneSdk() || globalSdk;
	return effectiveSdk === "admin" ? adminFiremix : clientFiremix;
};

export const firemixSdkZone = async <T = void>(
	sdk: FiremixSdk,
	fn: () => Promise<T>
): Promise<T> => {
	return zoneSdkStorage.run(sdk, fn);
};

export const firemixSdkZoneSync = <T = void>(sdk: FiremixSdk, fn: () => T): T => {
	const oldSdk = globalSdk;
	const oldEnabled = zoneSdkEnabled;
	setFiremixSdk(sdk);
	zoneSdkEnabled = false;
	try {
		return fn();
	} finally {
		setFiremixSdk(oldSdk);
		zoneSdkEnabled = oldEnabled;
	}
};
