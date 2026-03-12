import { Injectable } from '@nestjs/common';
import { ClassLogger } from '../../core/logging/class-logger.js';
import { PersonFactory } from '../person/domain/person.factory.js';
import { PersonRepository } from '../person/persistence/person.repository.js';
import { DomainError } from '../../shared/error/domain.error.js';
import { PersonExternalIdType } from '../person/domain/person.enums.js';
import { Person, PersonCreationParams } from '../person/domain/person.js';
import { PersonLdapImportDataBody } from './ldap/person-ldap-import.body.params.js';

@Injectable()
export class PersonLdapImportService {
    public constructor(
        private readonly logger: ClassLogger,
        private readonly personFactory: PersonFactory,
        private readonly personRepository: PersonRepository,
    ) {}

    public async createOrUpdatePerson(personLdapParams: PersonLdapImportDataBody): Promise<Person<true>> {
        this.logger.info('Person Creation/Update Phase started');

        const existingPerson: Option<Person<true>> = await this.personRepository.findByKeycloakUserId(
            personLdapParams.keycloakUserId,
        );

        if (existingPerson) {
            this.logger.info('Person exists, updating existing person');
            this.assignPersonParams(existingPerson, personLdapParams);
            await this.personRepository.update(existingPerson);
            this.logger.info(`Person with KeycloakUserId ${personLdapParams.keycloakUserId} successfully updated`);

            return existingPerson;
        } else {
            this.logger.info('Person does not exists, creating new person');

            const creationParams: PersonCreationParams = {
                familienname: personLdapParams.nachname,
                vorname: personLdapParams.vorname,
                externalIds: { [PersonExternalIdType.LDAP]: personLdapParams.externalId },
            };
            const result: Person<false> | DomainError = await this.personFactory.createNew(creationParams);

            if (result instanceof DomainError) {
                this.logger.error('Failed to create new person', result);
                throw result;
            }

            const newPerson: Person<false> = result;
            const persistedPerson: Person<true> = (await this.personRepository.create(newPerson)) as Person<true>;

            this.logger.info(`Person with KeycloakUserId ${personLdapParams.keycloakUserId} successfully created`);

            return persistedPerson;
        }
    }

    private assignPersonParams(existingPerson: Option<Person<true>>, personLdapParams: PersonLdapImportDataBody): void {
        existingPerson!.familienname = personLdapParams.nachname;
        existingPerson!.vorname = personLdapParams.vorname;
        existingPerson!.externalIds.LDAP = personLdapParams.externalId;
        existingPerson!.email = personLdapParams.email;
        existingPerson!.geburtsdatum = personLdapParams.geburtstag;
    }
}
