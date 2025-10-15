import { Blaze } from "./base";
import { ClientBlaze } from "./client";

const clientBlaze = new ClientBlaze();

export const blaze = (): Blaze => {
	return clientBlaze;
};
