import { Injectable } from '@nestjs/common';
import { PersonenkontextService } from '../../personenkontext/domain/personenkontext.service.js';
import { ServiceProviderRepo } from '../../service-provider/repo/service-provider.repo.js';
import { Personenkontext } from '../../personenkontext/domain/personenkontext.js';
import { ServiceProvider } from '../../service-provider/domain/service-provider.js';
import { RolleID } from '../../../shared/types/aggregate-ids.types.js';

@Injectable()
export class RollenMappingService {
    public constructor(
        private readonly serviceProviderRepo: ServiceProviderRepo,
        private readonly personenKontextService: PersonenkontextService,
    ) {}

    public async getRoleOnServiceProviderByClientName(clientName: string, userId: string): Promise<RolleID | null> {
        const serviceProvider: Option<ServiceProvider<true>> = await this.serviceProviderRepo.findByName(clientName);

        if (!serviceProvider) {
            return null;
        }

        const personenkontexte: Personenkontext<true>[] =
            await this.personenKontextService.findPersonenkontexteByPersonId(userId);
        const roleId: RolleID | null =
            personenkontexte.find(
                (pk: Personenkontext<true>) => pk.organisationId === serviceProvider.providedOnSchulstrukturknoten,
            )?.rolleId ?? null;

        return roleId;
    }
}
