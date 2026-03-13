import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from '../../memberships/entities/membership.entity';

@Injectable()
export class ClubMembershipGuard implements CanActivate {
  constructor(
    @InjectRepository(Membership)
    private membershipRepo: Repository<Membership>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const clubId = request.params.clubId;

    if (!clubId) return true;
    if (!user) throw new ForbiddenException('Nije autorizovano');

    const membership = await this.membershipRepo.findOne({
      where: { userId: user.sub, clubId },
    });

    if (!membership) throw new ForbiddenException('Niste član ovog kluba');

    request.user.role = membership.role;
    request.user.clubId = clubId;
    return true;
  }
}
