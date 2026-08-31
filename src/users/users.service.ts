import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Prisma, Priority, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { buildNewUserPendingActivationMessage } from 'src/notifications/templates/user-registration-notification';
import {
	AdminUpdateInput,
	assertEmailFormat,
	assertPhoneFormat,
	createUserSlug,
	isPrivilegedRole,
	CreateUserInput,
	sanitizeCreateUserInput,
	sanitizeSelfProfileFields,
	SelfUpdateInput,
	UpdateUserByActorInput,
} from './utils/users.utils';

@Injectable()
export class UsersService {
	constructor(
		private prisma: PrismaService,
		private supabase: SupabaseService,
	) {}

	async createUser(data: CreateUserInput) {
		if ((data as Record<string, unknown>).role !== undefined || (data as Record<string, unknown>).isActive !== undefined) {
			throw new BadRequestException('role and isActive cannot be set during user registration.');
		}

		const sanitizedData = sanitizeCreateUserInput(data);

		assertEmailFormat(sanitizedData.email);
		if (sanitizedData.phone) {
			assertPhoneFormat(sanitizedData.phone);
		}

		const existing = await this.prisma.user.findFirst({
			where: {
				OR: [
					{ supabaseId: sanitizedData.supabaseId },
					{ email: sanitizedData.email },
					{ name: sanitizedData.name },
					...(sanitizedData.phone ? [{ phone: sanitizedData.phone }] : []),
				],
			},
		});

		if (existing) {
			throw new ConflictException('User with this email, name, or phone already exists');
		}

		const slug = createUserSlug(sanitizedData.name);

		return this.prisma.$transaction(async (tx) => {
			const newUser = await tx.user.create({
				data: {
					supabaseId: sanitizedData.supabaseId,
					name: sanitizedData.name,
					email: sanitizedData.email,
					phone: sanitizedData.phone,
					role: Role.WORKER,
					isActive: false,
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
				const registrationNotification = buildNewUserPendingActivationMessage(newUser.name, newUser.email);

				await tx.message.createMany({
					data: managementUsers.map((manager) => ({
						senderId: newUser.id,
						recipientIds: [manager.id],
						subject: registrationNotification.subject,
						content: registrationNotification.content,
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

		if (isPrivilegedRole(actor.role)) {
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
				name: true,
				isActive: true,
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

		if (!isPrivilegedRole(actor.role) && actor.id !== user.id) {
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

		if (isPrivilegedRole(actor.role)) {
			return this.updateByManagement(id, data, actor);
		}

		throw new ForbiddenException('You can only update your own profile.');
	}

	private async updateOwnProfile(id: number, data: UpdateUserByActorInput) {
		const { role, isActive, ...profileFields } = data;

		if (role !== undefined || isActive !== undefined) {
			throw new ForbiddenException('You are not allowed to update role or isActive on your own account.');
		}

		const sanitizedProfileFields = sanitizeSelfProfileFields(profileFields as SelfUpdateInput);

		if (sanitizedProfileFields.phone !== undefined && sanitizedProfileFields.phone !== null) {
			assertPhoneFormat(sanitizedProfileFields.phone);
		}

		const updateData: Prisma.UserUpdateInput = { ...sanitizedProfileFields };

		if (updateData.name && typeof updateData.name === 'string') {
			updateData.slug = createUserSlug(updateData.name);
		}

		return this.prisma.user.update({
			where: { id },
			data: updateData,
		});
	}

	private async updateByManagement(id: number, data: UpdateUserByActorInput, actor: AuthenticatedUser) {
		const { role, isActive }: AdminUpdateInput = data;

		const hasUnexpectedFields =
			data.name !== undefined ||
			data.phone !== undefined;

		if (hasUnexpectedFields) {
			throw new ForbiddenException('Manager/Owner can only update role and isActive.');
		}

		if (role === undefined && isActive === undefined) {
			throw new BadRequestException('At least one of role or isActive must be provided.');
		}

		return this.prisma.$transaction(async (tx) => {
			const currentUser = await tx.user.findUnique({
				where: { id },
				select: {
					id: true,
					role: true,
					isActive: true,
				},
			});

			if (!currentUser) {
				throw new NotFoundException('User not found');
			}

			const nextRole = role ?? currentUser.role;
			const nextIsActive = isActive ?? currentUser.isActive;

			const roleChanged = nextRole !== currentUser.role;
			const statusChanged = nextIsActive !== currentUser.isActive;

			if (!roleChanged && !statusChanged) {
				return currentUser;
			}

			const updatedUser = await tx.user.update({
				where: { id },
				data: {
					...(role !== undefined ? { role } : {}),
					...(isActive !== undefined ? { isActive } : {}),
					// Role/status changes must take effect immediately, not once the
					// user's current access token happens to expire.
					sessionsInvalidatedAt: new Date(),
				},
			});

			const changes: string[] = [];
			if (roleChanged) {
				changes.push(`תפקיד: ${currentUser.role} -> ${nextRole}`);
			}
			if (statusChanged) {
				const currentStatus = currentUser.isActive ? 'פעיל' : 'לא פעיל';
				const nextStatus = nextIsActive ? 'פעיל' : 'לא פעיל';
				changes.push(`סטטוס: ${currentStatus} -> ${nextStatus}`);
			}

			await tx.message.create({
				data: {
					senderId: actor.id,
					recipientIds: [updatedUser.id],
					subject: 'עדכון פרטי משתמש',
					content: `בוצע עדכון בפרופיל שלך על ידי מנהל מערכת.\n${changes.join('\n')}`,
					priority: Priority.NORMAL,
				},
			});

			return updatedUser;
		});
	}

	async removeByActor(id: number, actor: AuthenticatedUser) {
		if (!actor) {
			throw new ForbiddenException('Authenticated user context is missing.');
		}

		if (!isPrivilegedRole(actor.role) && actor.id !== id) {
			throw new ForbiddenException('You can only remove your own user.');
		}

		try {
			return this.prisma.$transaction(async (tx) => {
				const user = await tx.user.findUnique({
					where: { id },
					select: { supabaseId: true },
				});

				if (!user) throw new NotFoundException('User not found');

				await tx.message.deleteMany({ where: { senderId: id } });
				const deleted = await tx.user.delete({ where: { id } });

				await this.supabase.adminAuth.deleteUser(user.supabaseId);

				return deleted;
			});
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
				throw new ConflictException('Cannot delete user because related records exist in the system.');
			}

			throw error;
		}
	}
}
