import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Prisma, Priority, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

type SelfUpdateInput = {
	name?: string;
	email?: string;
	phone?: string | null;
	currentPassword?: string;
	newPassword?: string;
};

type AdminUpdateInput = {
	role?: Role;
	isActive?: boolean;
};

type UpdateUserByActorInput = SelfUpdateInput & AdminUpdateInput;

@Injectable()
export class UsersService {
	private readonly saltRounds = 10;
	private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	private readonly passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
	private readonly privilegedRoles = new Set<Role>([Role.OWNER, Role.MANAGER]);

	constructor(private prisma: PrismaService) {}

	async createUser(data: Prisma.UserCreateInput) {
		this.assertEmailFormat(data.email);
		this.assertPasswordFormat(data.passwordHash);

		const existing = await this.prisma.user.findFirst({
			where: { OR: [{ email: data.email }, { name: data.name }] },
		});

		if (existing) {
			throw new ConflictException('User with this email or name already exists');
		}

		const hashedPassword = await bcrypt.hash(data.passwordHash, this.saltRounds);
		const slug = data.name.toLowerCase().replace(/ /g, '-');

		return this.prisma.$transaction(async (tx) => {
			const newUser = await tx.user.create({
				data: {
					...data,
					passwordHash: hashedPassword,
					slug,
				},
			});

			const managementUsers = await tx.user.findMany({
				where: {
					role: { in: [Role.MANAGER] },
					id: { not: newUser.id },
				},
				select: { id: true },
			});

			if (managementUsers.length > 0) {
				await tx.message.createMany({
					data: managementUsers.map((manager) => ({
						senderId: newUser.id,
						recipientIds: [manager.id],
						subject: 'משתמש חדש נרשם - מחכה לאישור הפעלה',
						content: `משתמש חדש (${newUser.name}, ${newUser.email}) נרשם ומחכה לאישור הפעלה.`,
						priority: Priority.NORMAL,
					})),
				});
			}

			return newUser;
		});
	}

	async findAllByActor(actor: AuthenticatedUser) {
		if (!actor) {
			throw new ForbiddenException('Authenticated user context is missing.');
		}

		if (this.isPrivileged(actor.role)) {
			return this.prisma.user.findMany({
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					role: true,
					isActive: true,
					slug: true,
					createdAt: true,
					updatedAt: true,
				},
				orderBy: { name: 'asc' },
			});
		}

		return this.prisma.user.findMany({
			select: { 
                id: true,
                name: true 
            },
			orderBy: { name: 'asc' },
		});
	}

	async findOneByActor(idOrSlug: number | string, actor: AuthenticatedUser) {
		if (!actor) {
			throw new ForbiddenException('Authenticated user context is missing.');
		}

		const user = await this.prisma.user.findFirst({
			where: typeof idOrSlug === 'number' ? { id: idOrSlug } : { slug: idOrSlug },
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
				role: true,
				isActive: true,
				slug: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		if (!this.isPrivileged(actor.role) && actor.id !== user.id) {
			throw new ForbiddenException('You can only access your own user.');
		}

		return user;
	}

	async updateUserByActor(id: number, data: UpdateUserByActorInput, actor: AuthenticatedUser) {
		if (!actor) {
			throw new ForbiddenException('Authenticated user context is missing.');
		}

		if (actor.id === id) {
			return this.updateOwnProfile(id, data);
		}

		if (this.isPrivileged(actor.role)) {
			return this.updateByManagement(id, data);
		}

		throw new ForbiddenException('You can only update your own profile.');
	}

	private async updateOwnProfile(id: number, data: UpdateUserByActorInput) {
		const { currentPassword, newPassword, role, isActive, ...profileFields } = data;

		if (role !== undefined || isActive !== undefined) {
			throw new ForbiddenException('You are not allowed to update role or isActive on your own account.');
		}

		if (profileFields.email !== undefined) {
			this.assertEmailFormat(profileFields.email);
		}

		const updateData: Prisma.UserUpdateInput = { ...profileFields };

		if (newPassword !== undefined) {
			this.assertPasswordFormat(newPassword);

			if (!currentPassword) {
				throw new BadRequestException('currentPassword is required to change password.');
			}

			const user = await this.prisma.user.findUnique({ where: { id } });
			if (!user) {
				throw new NotFoundException('User not found');
			}

			const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
			if (!isCurrentPasswordValid) {
				throw new ForbiddenException('Current password is incorrect.');
			}

			updateData.passwordHash = await bcrypt.hash(newPassword, this.saltRounds);
		}

		if (updateData.name && typeof updateData.name === 'string') {
			updateData.slug = updateData.name.toLowerCase().replace(/ /g, '-');
		}

		return this.prisma.user.update({
			where: { id },
			data: updateData,
		});
	}

	private async updateByManagement(id: number, data: UpdateUserByActorInput) {
		const { role, isActive } = data;

		const hasUnexpectedFields =
			data.name !== undefined ||
			data.email !== undefined ||
			data.phone !== undefined ||
			data.currentPassword !== undefined ||
			data.newPassword !== undefined;

		if (hasUnexpectedFields) {
			throw new ForbiddenException('Manager/Owner can only update role and isActive.');
		}

		if (role === undefined && isActive === undefined) {
			throw new BadRequestException('At least one of role or isActive must be provided.');
		}

		return this.prisma.user.update({
			where: { id },
			data: {
				...(role !== undefined ? { role } : {}),
				...(isActive !== undefined ? { isActive } : {}),
			},
		});
	}

	private assertEmailFormat(email: string) {
		if (!this.emailRegex.test(email)) {
			throw new BadRequestException('Invalid email format.');
		}
	}

	private assertPasswordFormat(password: string) {
		if (!this.passwordRegex.test(password)) {
			throw new BadRequestException(
				'Password must be at least 8 characters long and include letters and numbers.',
			);
		}
	}

	async toggleStatus(id: number, isActive: boolean) {
		return this.prisma.user.update({
			where: { id },
			data: { isActive },
		});
	}

	async removeByActor(id: number, actor: AuthenticatedUser) {
		if (!actor) {
			throw new ForbiddenException('Authenticated user context is missing.');
		}

		if (!this.isPrivileged(actor.role) && actor.id !== id) {
			throw new ForbiddenException('You can only remove your own user.');
		}

		return this.prisma.user.delete({
			where: { id },
		});
	}

	private isPrivileged(role: Role) {
		return this.privilegedRoles.has(role);
	}
}
