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
        this.logger.info(`PersonenKontext for Schule Creation/Update Phase Started`);
        const existingPersonenkontext: Personenkontext<true>[] =
            await this.personenkontextService.findPersonenkontexteByPersonId(person.id);

        if (!existingPersonenkontext.length) {
            const personenkontext: Personenkontext<false> = this.personenkontextFactory.createNew(
                person.id,
                schuleOrg.id,
                rolle.id,
            );
            const persistedPersonenkontext: Personenkontext<true> =
                await this.personenkontextRepo.save(personenkontext);

            return persistedPersonenkontext;
        } else {
            this.logger.info('Personenkontext for Schule exists, fetching the correct one');

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
        this.logger.info(`PersonenKontext for Klasse Creation Phase Started`);

        const existingPersonenkontext: Personenkontext<true>[] =
            await this.personenkontextService.findPersonenkontexteByPersonId(person.id);

        if (!existingPersonenkontext.length) {
            this.logger.info('Personenkontext for Klasse does not exist, creating a new one');
            const personenkontext: Personenkontext<false> = this.personenkontextFactory.createNew(
                person.id,
                klasseOrg.id,
                rolle.id,
            );
            const persistedPersonenkontext: Personenkontext<true> =
                await this.personenkontextRepo.save(personenkontext);

            return persistedPersonenkontext;
        } else {
            this.logger.info('Personenkontext for Klasse exists, fetching the correct one');

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
        const filteredPersonenkontext: Personenkontext<true>[] = existingPersonenkontext.filter(
            (personkontext: Personenkontext<true>) => {
                return personkontext.organisationId === org.id && personkontext.rolleId === rolle.id;
            },
        );

        if (filteredPersonenkontext.length === 0) {
            const personenkontext: Personenkontext<false> = this.personenkontextFactory.createNew(
                person.id,
                org.id,
                rolle.id,
            );
            const persistedPersonenkontext: Personenkontext<true> =
                await this.personenkontextRepo.save(personenkontext);

            return persistedPersonenkontext;
        } else if (filteredPersonenkontext.length > 1) {
            throw new ForbiddenException(
                'more than one personenkontext exists for this person with the same organisation and role',
            );
        } else {
            const personenkontext: Personenkontext<true> = filteredPersonenkontext[
                filteredPersonenkontext.length - 1
            ] as Personenkontext<true>;

            return personenkontext;
        }
    }
}
