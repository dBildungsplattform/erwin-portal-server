import { Injectable } from '@nestjs/common';
import { ClassLogger } from '../../../core/logging/class-logger.js';
import { UserExternalDataResponse } from './externaldata/user-externaldata.response.js';
import { PersonRepository } from '../../person/persistence/person.repository.js';
import { PersonenkontextService } from '../../personenkontext/domain/personenkontext.service.js';
import { OrganisationRepository } from '../../organisation/persistence/organisation.repository.js';
import { RolleRepo } from '../../rolle/repo/rolle.repo.js';
import { Person } from '../../person/domain/person.js';
import { DomainError } from '../../../shared/error/domain.error.js';
import { EntityNotFoundError } from '../../../shared/error/entity-not-found.error.js';
import { Personenkontext } from '../../personenkontext/domain/personenkontext.js';
import { UserExternalKlasseDataResponse } from './externaldata/user-external-klasse-data.response.js';
import { UserExternalSchuleDataResponse } from './externaldata/user-external-schule-data.response.js';
import { Organisation } from '../../organisation/domain/organisation.js';
import { OrganisationsTyp } from '../../organisation/domain/organisation.enums.js';
import { UserExternalPersonDataResponse } from './externaldata/user-external-person-data.response.js';

@Injectable()
export class KeycloakInternalService {
    public constructor(
        private readonly logger: ClassLogger,
        private readonly personRepo: PersonRepository,
        private readonly personenkontextService: PersonenkontextService,
        private readonly organisationRepository: OrganisationRepository,
        private readonly rolleRepo: RolleRepo,
    ) {}

    public async createUserExternalResponse(sub: string): Promise<UserExternalDataResponse> {
        const person: Option<Person<true>> = await this.personRepo.findByKeycloakUserId(sub);
        let userExternalKlasseDataResponses: UserExternalKlasseDataResponse[] = [];

        if (!person) {
            this.logger.error(`person with keycloakId ${sub} not found`);
            throw new EntityNotFoundError(`person with keycloakId ${sub} not found`);
        }

        const personenkontextList: Personenkontext<true>[] =
            await this.personenkontextService.findPersonenkontexteByPersonId(person.id);

        if (!personenkontextList.length) {
            this.logger.error(`No personenkontext entities found for person with keycloakId ${sub}`);
        }

        const userExternalPersonDataResponse: UserExternalPersonDataResponse = {
            externalId: person.externalIds.LDAP ? person.externalIds.LDAP: '',
            email: person.email
        };

        for await (const personenkontext of personenkontextList) {
            const org: Option<Organisation<true>> = await this.organisationRepository.findById(
                personenkontext.organisationId,
            );

            if (!org) {
                this.logger.info(`Organisation with id ${personenkontext.organisationId} does not exist in database`);
                continue;
            }

            if (org.typ === OrganisationsTyp.SCHULE) {

            }
        }
    }
}
