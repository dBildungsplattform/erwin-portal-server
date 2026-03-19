import { Test, TestingModule } from '@nestjs/testing';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { ForbiddenException } from '@nestjs/common';
import { ClassLogger } from '../../core/logging/class-logger.js';
import { PersonenkontextFactory } from '../personenkontext/domain/personenkontext.factory.js';
import { PersonenkontextService } from '../personenkontext/domain/personenkontext.service.js';
import { DBiamPersonenkontextRepoInternal } from '../personenkontext/persistence/internal-dbiam-personenkontext.repo.js';
import { Organisation } from '../organisation/domain/organisation.js';
import { Person } from '../person/domain/person.js';
import { Rolle } from '../rolle/domain/rolle.js';
import { Personenkontext } from '../personenkontext/domain/personenkontext.js';
import { OrganisationsTyp } from '../organisation/domain/organisation.enums.js';
import { faker } from '@faker-js/faker';
import { DoFactory } from '../../../test/utils/do-factory.js';
import { PersonenkontextLdapImportService } from './personenkontext-ldap-import.service.js';

describe('PersonenkontextLdapImportService', () => {
    let service: PersonenkontextLdapImportService;
    let personenkontextFactoryMock: DeepMocked<PersonenkontextFactory>;
    let personenkontextServiceMock: DeepMocked<PersonenkontextService>;
    let personenkontextRepoMock: DeepMocked<DBiamPersonenkontextRepoInternal>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PersonenkontextLdapImportService,
                { provide: ClassLogger, useValue: createMock<ClassLogger>() },
                { provide: PersonenkontextFactory, useValue: createMock<PersonenkontextFactory>() },
                { provide: PersonenkontextService, useValue: createMock<PersonenkontextService>() },
                { provide: DBiamPersonenkontextRepoInternal, useValue: createMock<DBiamPersonenkontextRepoInternal>() },
            ],
        }).compile();

        service = module.get(PersonenkontextLdapImportService);
        personenkontextFactoryMock = module.get(PersonenkontextFactory);
        personenkontextServiceMock = module.get(PersonenkontextService);
        personenkontextRepoMock = module.get(DBiamPersonenkontextRepoInternal);
    });

    describe('createOrUpdatePersonenkontextForSchule', () => {
        let schuleOrg: Organisation<true>;
        let rolle: Rolle<true>;
        let person: Person<true>;
        let newPersonenkontext: Personenkontext<false>;
        let persistedPersonenkontext: Personenkontext<true>;
        let existingPersonenkontexte: Personenkontext<true>[];

        beforeEach(() => {
            schuleOrg = DoFactory.createOrganisation(true, {
                id: faker.string.uuid(),
                name: faker.company.name(),
                typ: OrganisationsTyp.SCHULE,
            });
            rolle = DoFactory.createRolle(true, {
                id: faker.string.uuid(),
                name: faker.lorem.word(),
            });
            person = DoFactory.createPerson(true, {
                id: faker.string.uuid(),
                familienname: faker.person.lastName(),
                vorname: faker.person.firstName(),
            });
            newPersonenkontext = DoFactory.createPersonenkontext(false, {
                personId: person.id,
                organisationId: schuleOrg.id,
                rolleId: rolle.id,
            });
            persistedPersonenkontext = DoFactory.createPersonenkontext(true, {
                personId: person.id,
                organisationId: schuleOrg.id,
                rolleId: rolle.id,
            });
        });

        describe('when no existing personenkontext for the person', () => {
            it('should create and persist a new personenkontext for the schule', async () => {
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValueOnce([]);
                personenkontextFactoryMock.createNew.mockReturnValue(newPersonenkontext);
                personenkontextRepoMock.save.mockResolvedValueOnce(persistedPersonenkontext);

                const result: Personenkontext<true> = await service.createOrUpdatePersonenkontextForSchule(
                    schuleOrg,
                    rolle,
                    person,
                );

                expect(personenkontextServiceMock.findPersonenkontexteByPersonId).toHaveBeenCalledWith(person.id);
                expect(personenkontextFactoryMock.createNew).toHaveBeenCalledWith(person.id, schuleOrg.id, rolle.id);
                expect(personenkontextRepoMock.save).toHaveBeenCalledWith(newPersonenkontext);
                expect(result).toEqual(persistedPersonenkontext);
            });
        });

        describe('when existing personenkontexte exist', () => {
            beforeEach(() => {
                existingPersonenkontexte = [
                    DoFactory.createPersonenkontext(true, {
                        personId: person.id,
                        organisationId: faker.string.uuid(),
                        rolleId: faker.string.uuid(),
                    }),
                    persistedPersonenkontext,
                ];
            });

            it('should fetch the correct personenkontext from the list', async () => {
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValueOnce(
                    existingPersonenkontexte,
                );

                const result: Personenkontext<true> = await service.createOrUpdatePersonenkontextForSchule(
                    schuleOrg,
                    rolle,
                    person,
                );

                expect(personenkontextServiceMock.findPersonenkontexteByPersonId).toHaveBeenCalledWith(person.id);
                expect(result).toEqual(persistedPersonenkontext);
            });

            it('should throw if more than one personenkontext matches organisation and rolle', async () => {
                const duplicatePersonenkontexte: Personenkontext<true>[] = [
                    DoFactory.createPersonenkontext(true, {
                        personId: person.id,
                        organisationId: schuleOrg.id,
                        rolleId: rolle.id,
                    }),
                    DoFactory.createPersonenkontext(true, {
                        personId: person.id,
                        organisationId: schuleOrg.id,
                        rolleId: rolle.id,
                    }),
                ];
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValueOnce(
                    duplicatePersonenkontexte,
                );

                await expect(service.createOrUpdatePersonenkontextForSchule(schuleOrg, rolle, person)).rejects.toThrow(
                    ForbiddenException,
                );
            });

            describe('when no personenkontext matches organisation and rolle', () => {
                it('should create and persist a new personenkontext', async () => {
                    const unrelatedPersonenkontexte: Personenkontext<true>[] = [
                        DoFactory.createPersonenkontext(true, {
                            personId: person.id,
                            organisationId: faker.string.uuid(),
                            rolleId: faker.string.uuid(),
                        }),
                    ];
                    personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue(
                        unrelatedPersonenkontexte,
                    );
                    personenkontextFactoryMock.createNew.mockReturnValue(newPersonenkontext);
                    personenkontextRepoMock.save.mockResolvedValue(persistedPersonenkontext);

                    const result: Personenkontext<true> = await service.createOrUpdatePersonenkontextForSchule(
                        schuleOrg,
                        rolle,
                        person,
                    );

                    expect(personenkontextServiceMock.findPersonenkontexteByPersonId).toHaveBeenCalledWith(person.id);
                    expect(personenkontextFactoryMock.createNew).toHaveBeenCalledWith(
                        person.id,
                        schuleOrg.id,
                        rolle.id,
                    );
                    expect(personenkontextRepoMock.save).toHaveBeenCalledWith(newPersonenkontext);
                    expect(result).toEqual(persistedPersonenkontext);
                });
            });
        });
    });

    describe('createPersonenkontextForKlasseIfNotExists', () => {
        let klasseOrg: Organisation<true>;
        let rolle: Rolle<true>;
        let person: Person<true>;
        let newPersonenkontext: Personenkontext<false>;
        let persistedPersonenkontext: Personenkontext<true>;
        let existingPersonenkontexte: Personenkontext<true>[];

        beforeEach(() => {
            klasseOrg = DoFactory.createOrganisation(true, {
                id: faker.string.uuid(),
                name: faker.company.name(),
                typ: OrganisationsTyp.KLASSE,
            });
            rolle = DoFactory.createRolle(true, {
                id: faker.string.uuid(),
                name: faker.lorem.word(),
            });
            person = DoFactory.createPerson(true, {
                id: faker.string.uuid(),
                familienname: faker.person.lastName(),
                vorname: faker.person.firstName(),
            });
            newPersonenkontext = DoFactory.createPersonenkontext(false, {
                personId: person.id,
                organisationId: klasseOrg.id,
                rolleId: rolle.id,
            });
            persistedPersonenkontext = DoFactory.createPersonenkontext(true, {
                personId: person.id,
                organisationId: klasseOrg.id,
                rolleId: rolle.id,
            });
        });

        describe('when no existing personenkontext for the person', () => {
            it('should create and persist a new personenkontext for the klasse', async () => {
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([]);
                personenkontextFactoryMock.createNew.mockReturnValue(newPersonenkontext);
                personenkontextRepoMock.save.mockResolvedValue(persistedPersonenkontext);

                const result: Personenkontext<true> = await service.createPersonenkontextForKlasseIfNotExists(
                    klasseOrg,
                    rolle,
                    person,
                );

                expect(personenkontextServiceMock.findPersonenkontexteByPersonId).toHaveBeenCalledWith(person.id);
                expect(personenkontextFactoryMock.createNew).toHaveBeenCalledWith(person.id, klasseOrg.id, rolle.id);
                expect(personenkontextRepoMock.save).toHaveBeenCalledWith(newPersonenkontext);
                expect(result).toEqual(persistedPersonenkontext);
            });
        });

        describe('when existing personenkontexte exist', () => {
            beforeEach(() => {
                existingPersonenkontexte = [
                    DoFactory.createPersonenkontext(true, {
                        personId: person.id,
                        organisationId: faker.string.uuid(),
                        rolleId: faker.string.uuid(),
                    }),
                    persistedPersonenkontext,
                ];
            });

            it('should fetch the correct personenkontext from the list', async () => {
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue(existingPersonenkontexte);

                const result: Personenkontext<true> = await service.createPersonenkontextForKlasseIfNotExists(
                    klasseOrg,
                    rolle,
                    person,
                );

                expect(personenkontextServiceMock.findPersonenkontexteByPersonId).toHaveBeenCalledWith(person.id);
                expect(result).toEqual(persistedPersonenkontext);
            });

            describe('when no personenkontext matches organisation and rolle', () => {
                it('should create and persist a new personenkontext', async () => {
                    const unrelatedPersonenkontexte: Personenkontext<true>[] = [
                        DoFactory.createPersonenkontext(true, {
                            personId: person.id,
                            organisationId: faker.string.uuid(),
                            rolleId: faker.string.uuid(),
                        }),
                    ];
                    personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue(
                        unrelatedPersonenkontexte,
                    );
                    personenkontextFactoryMock.createNew.mockReturnValue(newPersonenkontext);
                    personenkontextRepoMock.save.mockResolvedValue(persistedPersonenkontext);

                    const result: Personenkontext<true> = await service.createPersonenkontextForKlasseIfNotExists(
                        klasseOrg,
                        rolle,
                        person,
                    );

                    expect(personenkontextServiceMock.findPersonenkontexteByPersonId).toHaveBeenCalledWith(person.id);
                    expect(personenkontextFactoryMock.createNew).toHaveBeenCalledWith(
                        person.id,
                        klasseOrg.id,
                        rolle.id,
                    );
                    expect(personenkontextRepoMock.save).toHaveBeenCalledWith(newPersonenkontext);
                    expect(result).toEqual(persistedPersonenkontext);
                });
            });

            describe('when more than one personenkontext matches organisation and rolle', () => {
                it('should throw an error', async () => {
                    const duplicatePersonenkontexte: Personenkontext<true>[] = [
                        DoFactory.createPersonenkontext(true, {
                            personId: person.id,
                            organisationId: klasseOrg.id,
                            rolleId: rolle.id,
                        }),
                        DoFactory.createPersonenkontext(true, {
                            personId: person.id,
                            organisationId: klasseOrg.id,
                            rolleId: rolle.id,
                        }),
                    ];
                    personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue(
                        duplicatePersonenkontexte,
                    );

                    await expect(
                        service.createPersonenkontextForKlasseIfNotExists(klasseOrg, rolle, person),
                    ).rejects.toThrow(ForbiddenException);
                    expect(personenkontextServiceMock.findPersonenkontexteByPersonId).toHaveBeenCalledWith(person.id);
                });
            });
        });
    });
});
