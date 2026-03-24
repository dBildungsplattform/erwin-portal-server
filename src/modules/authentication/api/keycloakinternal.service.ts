import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClassLogger } from '../../../core/logging/class-logger.js';
import { UserExternalDataResponse } from './externaldata/user-externaldata.response.js';
import { PersonRepository } from '../../person/persistence/person.repository.js';
import { PersonenkontextService } from '../../personenkontext/domain/personenkontext.service.js';
import { OrganisationRepository } from '../../organisation/persistence/organisation.repository.js';
import { RolleRepo } from '../../rolle/repo/rolle.repo.js';
import { Person } from '../../person/domain/person.js';
import { EntityNotFoundError } from '../../../shared/error/entity-not-found.error.js';
import { Personenkontext } from '../../personenkontext/domain/personenkontext.js';
import { UserExternalKlasseDataResponse } from './externaldata/user-external-klasse-data.response.js';
import { UserExternalSchuleDataResponse } from './externaldata/user-external-schule-data.response.js';
import { Organisation } from '../../organisation/domain/organisation.js';
import { OrganisationsTyp } from '../../organisation/domain/organisation.enums.js';
import { UserExternalPersonDataResponse } from './externaldata/user-external-person-data.response.js';
import { RollenArt } from '../../rolle/domain/rolle.enums.js';

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
        const person: Person<true> = await this.findPersonByKeycloakId(sub);
        const personenkontextList: Personenkontext<true>[] =
            await this.personenkontextService.findPersonenkontexteByPersonId(person.id);

        if (!personenkontextList.length) {
            this.logger.error(`No personenkontext entities found for person with keycloakId ${sub}`);
            throw new EntityNotFoundError(`No personenkontext entities found for person with keycloakId ${sub}`);
        }

        const userExternalPersonDataResponse: UserExternalPersonDataResponse = await this.createPersonDataResponse(
            person,
            personenkontextList,
        );

        const {
            schuleResponse,
            klasseResponses,
        }: {
            schuleResponse: UserExternalSchuleDataResponse;
            klasseResponses: UserExternalKlasseDataResponse[];
        } = await this.processOrganisations(personenkontextList);

        return new UserExternalDataResponse(sub, userExternalPersonDataResponse, schuleResponse, klasseResponses);
    }

    private async findPersonByKeycloakId(sub: string): Promise<Person<true>> {
        const person: Option<Person<true>> = await this.personRepo.findByKeycloakUserId(sub);
        if (!person) {
            this.logger.error(`person with keycloakId ${sub} not found`);
            throw new EntityNotFoundError(`person with keycloakId ${sub} not found`);
        }
        return person;
    }

    private async createPersonDataResponse(
        person: Person<true>,
        personenkontextList: Personenkontext<true>[],
    ): Promise<UserExternalPersonDataResponse> {
        const rolleId: string | undefined = personenkontextList[0]?.rolleId;
        const rolle: RollenArt = rolleId
            ? ((await this.rolleRepo.findById(rolleId))?.rollenart ?? RollenArt.EXTERN)
            : RollenArt.EXTERN;

        return new UserExternalPersonDataResponse({
            externalId: person.externalIds.LDAP,
            email: person.email ?? '',
            vorname: person.vorname ?? '',
            familienname: person.familienname ?? '',
            rolle: rolle,
            erwinId: person.id,
        });
    }

    private async processOrganisations(personenkontextList: Personenkontext<true>[]): Promise<{
        schuleResponse: UserExternalSchuleDataResponse;
        klasseResponses: UserExternalKlasseDataResponse[];
    }> {
        const klasseResponses: UserExternalKlasseDataResponse[] = [];
        const schuleResponses: UserExternalSchuleDataResponse[] = [];

        for await (const personenkontext of personenkontextList) {
            const org: Option<Organisation<true>> = await this.organisationRepository.findById(
                personenkontext.organisationId,
            );

            if (!org) {
                this.logger.info(`Organisation with id ${personenkontext.organisationId} does not exist in database`);
                continue;
            }

            if (org.typ === OrganisationsTyp.SCHULE && org.externalIds?.LDAP && org.zugehoerigZu && org.name) {
                schuleResponses.push(
                    new UserExternalSchuleDataResponse({
                        externalId: org.externalIds.LDAP,
                        zugehoerigZu: org.zugehoerigZu,
                        name: org.name,
                        erwinId: org.id,
                    }),
                );
            }

            if (org.typ === OrganisationsTyp.KLASSE && org.externalIds?.LDAP && org.name) {
                klasseResponses.push(
                    new UserExternalKlasseDataResponse({
                        name: org.name,
                        externalId: org.externalIds.LDAP,
                        erwinId: org.id,
                    }),
                );
            }
        }

        if (schuleResponses.length === 0) {
            throw new EntityNotFoundError('SCHULE Organisation', 'user has none');
        }

        if (schuleResponses.length > 1) {
            throw new ForbiddenException('User has more than one SCHULE organisation');
        }

        return {
            schuleResponse: schuleResponses[0]!,
            klasseResponses,
        };
    }
}
