import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../common/database/prisma.service";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";

@Injectable()
export class UsersService {
	constructor(private readonly prisma: PrismaService) {}

	async getCurrentUser(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				username: true,
				email: true,
				role: true,
				isActive: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!user) {
			throw new NotFoundException("ユーザーが見つかりません");
		}

		return this.toResponse(user);
	}

	async updateProfile(userId: string, dto: UpdateUserProfileDto) {
		if (!dto.username && !dto.email) {
			throw new BadRequestException("更新する項目がありません");
		}

		const updateData: Prisma.UserUpdateInput = {};

		if (dto.username) {
			await this.ensureUniqueUsername(dto.username, userId);
			updateData.username = dto.username;
		}

		if (dto.email) {
			await this.ensureUniqueEmail(dto.email, userId);
			updateData.email = dto.email;
		}

		try {
			const user = await this.prisma.user.update({
				where: { id: userId },
				data: updateData,
				select: {
					id: true,
					username: true,
					email: true,
					role: true,
					isActive: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			return this.toResponse(user);
		} catch (error) {
			if (error instanceof Error) {
				throw new BadRequestException(error.message);
			}
			throw error;
		}
	}

	async updatePassword(userId: string, dto: UpdatePasswordDto) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { passwordHash: true },
		});

		if (!user) {
			throw new NotFoundException("ユーザーが見つかりません");
		}

		const isCurrentValid = await bcrypt.compare(
			dto.currentPassword,
			user.passwordHash,
		);

		if (!isCurrentValid) {
			throw new BadRequestException("現在のパスワードが正しくありません");
		}

		if (dto.currentPassword === dto.newPassword) {
			throw new BadRequestException(
				"新しいパスワードは現在のパスワードと異なる必要があります",
			);
		}

		const newHash = await bcrypt.hash(dto.newPassword, 10);

		await this.prisma.user.update({
			where: { id: userId },
			data: { passwordHash: newHash },
		});

		return { success: true };
	}

	private async ensureUniqueUsername(username: string, userId: string) {
		const existingUser = await this.prisma.user.findFirst({
			where: {
				username,
				NOT: { id: userId },
			},
			select: { id: true },
		});

		if (existingUser) {
			throw new BadRequestException("このユーザー名は既に使用されています");
		}
	}

	private async ensureUniqueEmail(email: string, userId: string) {
		const existingEmail = await this.prisma.user.findFirst({
			where: {
				email,
				NOT: { id: userId },
			},
			select: { id: true },
		});

		if (existingEmail) {
			throw new BadRequestException("このメールアドレスは既に使用されています");
		}
	}

	private toResponse<T extends { id: string }>(user: T) {
		return {
			userId: user.id,
			...user,
		};
	}
}
