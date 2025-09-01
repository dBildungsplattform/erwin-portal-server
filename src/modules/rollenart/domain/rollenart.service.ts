import { ClassLogger } from '../../../core/logging/class-logger.js';
import { RollenartRepo } from '../repo/rollenart.repo.js';

export class RollenartService {
    public constructor(
        private readonly rollenartRepo: RollenartRepo,
        private readonly logger: ClassLogger,
    ) {}

    public getAllLmsRollenarten(): string[] {
        return this.rollenartRepo.getAllRollenarten();
    }
}
