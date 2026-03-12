import { Test, TestingModule } from '@nestjs/testing';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { ClassLogger } from '../../core/logging/class-logger.js';
import { PersonRepository } from '../person/persistence/person.repository.js';
import { PersonFactory } from '../person/domain/person.factory.js';
import { Person } from '../person/domain/person.js';
import { PersonLdapImportDataBody } from './ldap/person-ldap-import.body.params.js';
import { DomainError } from '../../shared/error/index.js';
import { faker } from '@faker-js/faker';
import { DoFactory } from '../../../test/utils/do-factory.js';
import { PersonLdapImportService } from './person-ldap-import.service.js';

describe('PersonLdapImportService', () => {
    let service: PersonLdapImportService;
    let personRepositoryMock: DeepMocked<PersonRepository>;
    let personFactoryMock: DeepMocked<PersonFactory>;

    class TestDomainError extends DomainError {
        public constructor(message: string, code: string) {
            super(message, code);
        }
    }

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PersonLdapImportService,
                { provide: ClassLogger, useValue: createMock<ClassLogger>() },
                { provide: PersonRepository, useValue: createMock<PersonRepository>() },
                { provide: PersonFactory, useValue: createMock<PersonFactory>() },
            ],
        }).compile();

        service = module.get(PersonLdapImportService);
        personRepositoryMock = module.get(PersonRepository);
        personFactoryMock = module.get(PersonFactory);
    });

    describe('createOrUpdatePerson', () => {
        let personLdapParams: PersonLdapImportDataBody;
        let existingPerson: Person<true>;
        let updatedPerson: Person<true>;
        let newPerson: Person<false>;
        let persistedPerson: Person<true>;

        beforeEach(() => {
            personLdapParams = {
                keycloakUserId: faker.string.uuid(),
                nachname: faker.person.lastName(),
                vorname: faker.person.firstName(),
                externalId: faker.string.uuid(),
                email: faker.internet.email(),
                geburtstag: faker.date.birthdate(),
            };

            existingPerson = DoFactory.createPerson(true, {
                keycloakUserId: personLdapParams.keycloakUserId,
                familienname: faker.person.lastName(),
                vorname: faker.person.firstName(),
                externalIds: { LDAP: faker.string.uuid() },
                email: faker.internet.email(),
                geburtsdatum: faker.date.birthdate(),
            });

            updatedPerson = existingPerson;

            newPerson = DoFactory.createPerson(false, {
                familienname: personLdapParams.nachname,
                vorname: personLdapParams.vorname,
                externalIds: { LDAP: personLdapParams.externalId },
            });

            persistedPerson = DoFactory.createPerson(true, {
                familienname: personLdapParams.nachname,
                vorname: personLdapParams.vorname,
                externalIds: { LDAP: personLdapParams.externalId },
                keycloakUserId: personLdapParams.keycloakUserId,
                email: personLdapParams.email,
                geburtsdatum: personLdapParams.geburtstag,
            });
        });

        describe('when person exists', () => {
            it('should update the existing person and return it', async () => {
                personRepositoryMock.findByKeycloakUserId.mockResolvedValue(existingPerson);
                personRepositoryMock.update.mockResolvedValue(updatedPerson);

                const result: Person<true> = await service.createOrUpdatePerson(personLdapParams);

                expect(personRepositoryMock.findByKeycloakUserId).toHaveBeenCalledWith(
                    personLdapParams.keycloakUserId,
                );
                expect(personRepositoryMock.update).toHaveBeenCalledWith(existingPerson);
                expect(result).toBe(existingPerson);
                expect(existingPerson.familienname).toBe(personLdapParams.nachname);
                expect(existingPerson.vorname).toBe(personLdapParams.vorname);
                expect(existingPerson.externalIds.LDAP).toBe(personLdapParams.externalId);
                expect(existingPerson.email).toBe(personLdapParams.email);
                expect(existingPerson.geburtsdatum).toBe(personLdapParams.geburtstag);
            });
        });

        describe('when person does not exist', () => {
            it('should create a new person and return the persisted person', async () => {
                personRepositoryMock.findByKeycloakUserId.mockResolvedValue(undefined);
                personFactoryMock.createNew.mockResolvedValue(newPerson);
                personRepositoryMock.create.mockResolvedValue(persistedPerson);

                const result: Person<true> = await service.createOrUpdatePerson(personLdapParams);

                expect(personRepositoryMock.findByKeycloakUserId).toHaveBeenCalledWith(
                    personLdapParams.keycloakUserId,
                );
                expect(personFactoryMock.createNew).toHaveBeenCalledWith({
                    familienname: personLdapParams.nachname,
                    vorname: personLdapParams.vorname,
                    externalIds: { LDAP: personLdapParams.externalId },
                });
                expect(personRepositoryMock.create).toHaveBeenCalledWith(newPerson);
                expect(result).toBe(persistedPerson);
            });

            describe('when personFactory.createNew returns a DomainError', () => {
                it('should throw the DomainError', async () => {
                    const domainError: DomainError = new TestDomainError('creation failed', '500');
                    personRepositoryMock.findByKeycloakUserId.mockResolvedValue(undefined);
                    personFactoryMock.createNew.mockResolvedValue(domainError);

                    await expect(service.createOrUpdatePerson(personLdapParams)).rejects.toThrow(domainError);
                    expect(personFactoryMock.createNew).toHaveBeenCalled();
                    expect(personRepositoryMock.create).not.toHaveBeenCalled();
                });
            });
        });
    });
});
