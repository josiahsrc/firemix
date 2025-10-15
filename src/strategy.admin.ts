import { AdminBlaze } from "./admin";
import { Blaze } from "./base";

const adminBlaze = new AdminBlaze();

export const blaze = (): Blaze => {
	return adminBlaze;
};
