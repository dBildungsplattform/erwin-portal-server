import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClassLogger } from '../../core/logging/class-logger.js';
import { Organisation } from '../organisation/domain/organisation.js';
import { Person } from '../person/domain/person.js';
import { PersonenkontextFactory } from '../personenkontext/domain/personenkontext.factory.js';
import { Personenkontext } from '../personenkontext/domain/personenkontext.js';
import { PersonenkontextService } from '../personenkontext/domain/personenkontext.service.js';
import { DBiamPersonenkontextRepoInternal } from '../personenkontext/persistence/internal-dbiam-personenkontext.repo.js';
import { Rolle } from '../rolle/domain/rolle.js';

@Injectable()
export class PersonenkontextLdapImportService {
    public constructor(
        private readonly logger: ClassLogger,
        private readonly personenkontextFactory: PersonenkontextFactory,
        private readonly personenkontextService: PersonenkontextService,
        private readonly personenkontextRepo: DBiamPersonenkontextRepoInternal,
    ) {}

    public async createOrUpdatePersonenkontextForSchule(
        schuleOrg: Organisation<true>,
        rolle: Rolle<true>,
        person: Person<true>,
    ): Promise<Personenkontext<true>> {
        const personFullName: string = `${person.vorname} ${person.familienname}`;
        this.logger.info(
            `Personenkontext for Schule Creation/Update Phase started for person '${personFullName}' in organisation '${schuleOrg.name}'`,
        );
        const existingPersonenkontext: Personenkontext<true>[] =
            await this.personenkontextService.findPersonenkontexteByPersonId(person.id);

        if (!existingPersonenkontext.length) {
            this.logger.info(
                `Personenkontext does not exist for person '${personFullName}' in Schule '${schuleOrg.name}', creating new one`,
            );
            const personenkontext: Personenkontext<false> = this.personenkontextFactory.createNew(
                person.id,
                schuleOrg.id,
                rolle.id,
            );
            const persistedPersonenkontext: Personenkontext<true> =
                await this.personenkontextRepo.save(personenkontext);

            this.logger.info(
                `Personenkontext successfully created for person '${personFullName}' in Schule '${schuleOrg.name}' with id: ${persistedPersonenkontext.id}`,
            );
            return persistedPersonenkontext;
        } else {
            this.logger.info(
                `Personenkontext for Schule exists for person '${personFullName}', fetching the correct one`,
            );

            const personenkontext: Personenkontext<true> = await this.fetchPersonenkontextFromList(
                existingPersonenkontext,
                schuleOrg,
                rolle,
                person,
            );

            return personenkontext;
        }
    }

    public async createPersonenkontextForKlasseIfNotExists(
        klasseOrg: Organisation<true>,
        rolle: Rolle<true>,
        person: Person<true>,
    ): Promise<Personenkontext<true>> {
        const personFullName: string = `${person.vorname} ${person.familienname}`;
        this.logger.info(
            `Personenkontext for Klasse Creation Phase started for person '${personFullName}' in organisation '${klasseOrg.name}'`,
        );

        const existingPersonenkontext: Personenkontext<true>[] =
            await this.personenkontextService.findPersonenkontexteByPersonId(person.id);

        if (!existingPersonenkontext.length) {
            this.logger.info(
                `Personenkontext does not exist for person '${personFullName}' in Klasse '${klasseOrg.name}', creating a new one`,
            );
            const personenkontext: Personenkontext<false> = this.personenkontextFactory.createNew(
                person.id,
                klasseOrg.id,
                rolle.id,
            );
            const persistedPersonenkontext: Personenkontext<true> =
                await this.personenkontextRepo.save(personenkontext);

            this.logger.info(
                `Personenkontext successfully created for person '${personFullName}' in Klasse '${klasseOrg.name}' with id: ${persistedPersonenkontext.id}`,
            );
            return persistedPersonenkontext;
        } else {
            this.logger.info(
                `Personenkontext for Klasse exists for person '${personFullName}', fetching the correct one`,
            );

            const personenkontext: Personenkontext<true> = await this.fetchPersonenkontextFromList(
                existingPersonenkontext,
                klasseOrg,
                rolle,
                person,
            );

            return personenkontext;
        }
    }

    private async fetchPersonenkontextFromList(
        existingPersonenkontext: Personenkontext<true>[],
        org: Organisation<true>,
        rolle: Rolle<true>,
        person: Person<true>,
    ): Promise<Personenkontext<true>> {
        const personFullName: string = `${person.vorname} ${person.familienname}`;
        const filteredPersonenkontext: Personenkontext<true>[] = existingPersonenkontext.filter(
            (personkontext: Personenkontext<true>) => {
                return personkontext.organisationId === org.id && personkontext.rolleId === rolle.id;
            },
        );

        if (filteredPersonenkontext.length === 0) {
            this.logger.info(
                `No matching Personenkontext found for person '${personFullName}' in organisation '${org.name}', creating new one`,
            );
            const personenkontext: Personenkontext<false> = this.personenkontextFactory.createNew(
                person.id,
                org.id,
                rolle.id,
            );
            const persistedPersonenkontext: Personenkontext<true> =
                await this.personenkontextRepo.save(personenkontext);

            this.logger.info(
                `Personenkontext successfully created for person '${personFullName}' in organisation '${org.name}' with id: ${persistedPersonenkontext.id}`,
            );
            return persistedPersonenkontext;
        } else if (filteredPersonenkontext.length > 1) {
            throw new ForbiddenException(
                `More than one personenkontext exists for person '${personFullName}' in organisation '${org.name}' with the same role`,
            );
        } else {
            const personenkontext: Personenkontext<true> = filteredPersonenkontext[
                filteredPersonenkontext.length - 1
            ] as Personenkontext<true>;

            this.logger.info(
                `Personenkontext found for person '${personFullName}' in organisation '${org.name}' with id: ${personenkontext.id}`,
            );
            return personenkontext;
        }
    }
}
