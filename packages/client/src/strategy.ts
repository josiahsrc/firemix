import { Firemix } from "@firemix/core";
import { FiremixClient } from "./client.js";

const clientFiremix = new FiremixClient();

export const firemix = (): Firemix => {
	return clientFiremix;
};
