import { FiremixAdmin } from "./admin.js";
import { Firemix } from "@firemix/core";

const adminFiremix = new FiremixAdmin();

export const firemix = (): Firemix => {
	return adminFiremix;
};
