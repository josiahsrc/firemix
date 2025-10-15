import { Firemix } from "@firemix/core";
import { FiremixClient } from "./client";

const clientFiremix = new FiremixClient();

export const firemix = (): Firemix => {
	return clientFiremix;
};
