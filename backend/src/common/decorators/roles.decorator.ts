import { SetMetadata } from '@nestjs/common';
import { ClubRole } from '../enums';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ClubRole[]) => SetMetadata(ROLES_KEY, roles);
