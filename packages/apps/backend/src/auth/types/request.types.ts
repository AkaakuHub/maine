import type { Request } from "express";

type User = {
	userId: string;
	id: string;
	username: string;
	email: string;
	role: string;
	isActive: boolean;
};

export interface RequestWithUser extends Request {
	user: User;
}
