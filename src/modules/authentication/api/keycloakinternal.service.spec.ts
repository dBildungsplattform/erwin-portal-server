import { Test, TestingModule } from '@nestjs/testing';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { ForbiddenException } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { KeycloakInternalService } from './keycloakinternal.service.js';
import { ClassLogger } from '../../../core/logging/class-logger.js';
import { PersonRepository } from '../../person/persistence/person.repository.js';
import { PersonenkontextService } from '../../personenkontext/domain/personenkontext.service.js';
import { OrganisationRepository } from '../../organisation/persistence/organisation.repository.js';
import { RolleRepo } from '../../rolle/repo/rolle.repo.js';
import { Person } from '../../person/domain/person.js';
import { Personenkontext } from '../../personenkontext/domain/personenkontext.js';
import { Organisation } from '../../organisation/domain/organisation.js';
import { Rolle } from '../../rolle/domain/rolle.js';
import { OrganisationsTyp } from '../../organisation/domain/organisation.enums.js';
import { RollenArt } from '../../rolle/domain/rolle.enums.js';
import { EntityNotFoundError } from '../../../shared/error/entity-not-found.error.js';
import { UserExternalDataResponse } from './externaldata/user-externaldata.response.js';
import { DoFactory } from '../../../../test/utils/do-factory.js';

describe('KeycloakInternalService', () => {
    let service: KeycloakInternalService;
    let loggerMock: DeepMocked<ClassLogger>;
    let personRepoMock: DeepMocked<PersonRepository>;
    let personenkontextServiceMock: DeepMocked<PersonenkontextService>;
    let organisationRepositoryMock: DeepMocked<OrganisationRepository>;
    let rolleRepoMock: DeepMocked<RolleRepo>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                KeycloakInternalService,
                { provide: ClassLogger, useValue: createMock<ClassLogger>() },
                { provide: PersonRepository, useValue: createMock<PersonRepository>() },
                { provide: PersonenkontextService, useValue: createMock<PersonenkontextService>() },
                { provide: OrganisationRepository, useValue: createMock<OrganisationRepository>() },
                { provide: RolleRepo, useValue: createMock<RolleRepo>() },
            ],
        }).compile();

        service = module.get(KeycloakInternalService);
        loggerMock = module.get(ClassLogger);
        personRepoMock = module.get(PersonRepository);
        personenkontextServiceMock = module.get(PersonenkontextService);
        organisationRepositoryMock = module.get(OrganisationRepository);
        rolleRepoMock = module.get(RolleRepo);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('createUserExternalResponse', () => {
        let sub: string;
        let person: Person<true>;
        let personenkontext: Personenkontext<true>;
        let rolle: Rolle<true>;
        let schuleOrg: Organisation<true>;
        let klasseOrg: Organisation<true>;

        beforeEach(() => {
            sub = faker.string.uuid();

            person = DoFactory.createPerson(true, {
                keycloakUserId: sub,
                externalIds: { LDAP: faker.string.uuid() },
                email: faker.internet.email(),
                vorname: faker.person.firstName(),
                familienname: faker.person.lastName(),
            });

            personenkontext = DoFactory.createPersonenkontext(true, {
                personId: person.id,
                rolleId: faker.string.uuid(),
                organisationId: faker.string.uuid(),
            });

            rolle = DoFactory.createRolle(true, {
                id: personenkontext.rolleId,
                rollenart: RollenArt.LEHR,
            });

            schuleOrg = DoFactory.createOrganisation(true, {
                id: personenkontext.organisationId,
                typ: OrganisationsTyp.SCHULE,
                externalIds: { LDAP: faker.string.uuid() },
                zugehoerigZu: faker.string.uuid(),
                name: faker.company.name(),
            });

            klasseOrg = DoFactory.createOrganisation(true, {
                typ: OrganisationsTyp.KLASSE,
                externalIds: { LDAP: faker.string.uuid() },
                name: faker.company.name(),
            });
        });

        describe('when person is found with valid personenkontext and organisations', () => {
            it('should return UserExternalDataResponse with schule and klasse data', async () => {
                const klassePersonenkontext: Personenkontext<true> = DoFactory.createPersonenkontext(true, {
                    personId: person.id,
                    rolleId: personenkontext.rolleId,
                    organisationId: klasseOrg.id,
                });

                personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([
                    personenkontext,
                    klassePersonenkontext,
                ]);
                rolleRepoMock.findById.mockResolvedValue(rolle);
                organisationRepositoryMock.findById.mockResolvedValueOnce(schuleOrg).mockResolvedValueOnce(klasseOrg);

                const result: UserExternalDataResponse = await service.createUserExternalResponse(sub);

                expect(result.keycloakUserId).toEqual(sub);
                expect(result.personData).toEqual({
                    externalId: person.externalIds.LDAP,
                    email: person.email,
                    vorname: person.vorname,
                    familienname: person.familienname,
                    rolle: RollenArt.LEHR,
                    erwinId: person.id,
                });
                expect(result.schuleData).toEqual({
                    externalId: schuleOrg.externalIds?.LDAP,
                    zugehoerigZu: schuleOrg.zugehoerigZu,
                    name: schuleOrg.name,
                    erwinId: schuleOrg.id,
                });
                expect(result.klasseData).toHaveLength(1);
                expect(result.klasseData?.[0]).toEqual({
                    name: klasseOrg.name,
                    externalId: klasseOrg.externalIds?.LDAP,
                    erwinId: klasseOrg.id,
                });
            });
        });

        describe('when person is not found', () => {
            it('should throw EntityNotFoundError', async () => {
                personRepoMock.findByKeycloakUserId.mockResolvedValue(null);

                await expect(service.createUserExternalResponse(sub)).rejects.toThrow(EntityNotFoundError);
                expect(loggerMock.error).toHaveBeenCalledWith(`person with keycloakId ${sub} not found`);
            });
        });

        describe('when no personenkontext entities are found', () => {
            it('should throw EntityNotFoundError', async () => {
                personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([]);

                await expect(service.createUserExternalResponse(sub)).rejects.toThrow(EntityNotFoundError);
                expect(loggerMock.error).toHaveBeenCalledWith(
                    `No personenkontext entities found for person with keycloakId ${sub}`,
                );
            });
        });

        describe('when rolle is not found for personenkontext', () => {
            it('should default to RollenArt.EXTERN', async () => {
                personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                rolleRepoMock.findById.mockResolvedValue(null);
                organisationRepositoryMock.findById.mockResolvedValue(schuleOrg);

                const result: UserExternalDataResponse = await service.createUserExternalResponse(sub);

                expect(result.personData.rolle).toEqual(RollenArt.EXTERN);
            });
        });

        describe('when personenkontext has no rolleId', () => {
            it('should default to RollenArt.EXTERN', async () => {
                const personenkontextWithoutRolle: Personenkontext<true> = DoFactory.createPersonenkontext(true, {
                    personId: person.id,
                    rolleId: undefined as unknown as string,
                    organisationId: schuleOrg.id,
                });

                personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([
                    personenkontextWithoutRolle,
                ]);
                organisationRepositoryMock.findById.mockResolvedValue(schuleOrg);

                const result: UserExternalDataResponse = await service.createUserExternalResponse(sub);

                expect(result.personData.rolle).toEqual(RollenArt.EXTERN);
                expect(rolleRepoMock.findById).not.toHaveBeenCalled();
            });
        });

        describe('when organisation does not exist in database', () => {
            it('should skip the organisation, log info message, and throw EntityNotFoundError', async () => {
                personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                rolleRepoMock.findById.mockResolvedValue(rolle);
                organisationRepositoryMock.findById.mockResolvedValue(null);

                await expect(service.createUserExternalResponse(sub)).rejects.toThrow(EntityNotFoundError);
                expect(loggerMock.info).toHaveBeenCalledWith(
                    `Organisation with id ${personenkontext.organisationId} does not exist in database`,
                );
            });
        });

        describe('when schule organisation is missing required fields', () => {
            describe('when schule has no externalIds.LDAP', () => {
                it('should throw EntityNotFoundError', async () => {
                    const schuleWithoutLdap: Organisation<true> = DoFactory.createOrganisation(true, {
                        typ: OrganisationsTyp.SCHULE,
                        externalIds: undefined,
                        zugehoerigZu: faker.string.uuid(),
                        name: faker.company.name(),
                    });

                    personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                    personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                    rolleRepoMock.findById.mockResolvedValue(rolle);
                    organisationRepositoryMock.findById.mockResolvedValue(schuleWithoutLdap);

                    await expect(service.createUserExternalResponse(sub)).rejects.toThrow(EntityNotFoundError);
                });
            });

            describe('when schule has no zugehoerigZu', () => {
                it('should throw EntityNotFoundError', async () => {
                    const schuleWithoutZugehoerigZu: Organisation<true> = DoFactory.createOrganisation(true, {
                        typ: OrganisationsTyp.SCHULE,
                        externalIds: { LDAP: faker.string.uuid() },
                        zugehoerigZu: undefined,
                        name: faker.company.name(),
                    });

                    personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                    personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                    rolleRepoMock.findById.mockResolvedValue(rolle);
                    organisationRepositoryMock.findById.mockResolvedValue(schuleWithoutZugehoerigZu);

                    await expect(service.createUserExternalResponse(sub)).rejects.toThrow(EntityNotFoundError);
                });
            });

            describe('when schule has no name', () => {
                it('should throw EntityNotFoundError', async () => {
                    const schuleWithoutName: Organisation<true> = DoFactory.createOrganisation(true, {
                        typ: OrganisationsTyp.SCHULE,
                        externalIds: { LDAP: faker.string.uuid() },
                        zugehoerigZu: faker.string.uuid(),
                        name: undefined,
                    });

                    personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                    personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                    rolleRepoMock.findById.mockResolvedValue(rolle);
                    organisationRepositoryMock.findById.mockResolvedValue(schuleWithoutName);

                    await expect(service.createUserExternalResponse(sub)).rejects.toThrow(EntityNotFoundError);
                });
            });
        });

        describe('when klasse organisation is missing required fields', () => {
            describe('when klasse has no externalIds.LDAP', () => {
                it('should not include klasse in response but throw EntityNotFoundError due to no schule', async () => {
                    const klasseWithoutLdap: Organisation<true> = DoFactory.createOrganisation(true, {
                        typ: OrganisationsTyp.KLASSE,
                        externalIds: undefined,
                        name: faker.company.name(),
                    });

                    personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                    personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                    rolleRepoMock.findById.mockResolvedValue(rolle);
                    organisationRepositoryMock.findById.mockResolvedValue(klasseWithoutLdap);

                    await expect(service.createUserExternalResponse(sub)).rejects.toThrow(EntityNotFoundError);
                });
            });

            describe('when klasse has no name', () => {
                it('should not include klasse in response but throw EntityNotFoundError due to no schule', async () => {
                    const klasseWithoutName: Organisation<true> = DoFactory.createOrganisation(true, {
                        typ: OrganisationsTyp.KLASSE,
                        externalIds: { LDAP: faker.string.uuid() },
                        name: undefined,
                    });

                    personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                    personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                    rolleRepoMock.findById.mockResolvedValue(rolle);
                    organisationRepositoryMock.findById.mockResolvedValue(klasseWithoutName);

                    await expect(service.createUserExternalResponse(sub)).rejects.toThrow(EntityNotFoundError);
                });
            });
        });

        describe('when user has more than one SCHULE organisation', () => {
            it('should throw ForbiddenException', async () => {
                const schuleOrg2: Organisation<true> = DoFactory.createOrganisation(true, {
                    typ: OrganisationsTyp.SCHULE,
                    externalIds: { LDAP: faker.string.uuid() },
                    zugehoerigZu: faker.string.uuid(),
                    name: faker.company.name(),
                });

                const personenkontext2: Personenkontext<true> = DoFactory.createPersonenkontext(true, {
                    personId: person.id,
                    rolleId: personenkontext.rolleId,
                    organisationId: schuleOrg2.id,
                });

                personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([
                    personenkontext,
                    personenkontext2,
                ]);
                rolleRepoMock.findById.mockResolvedValue(rolle);
                organisationRepositoryMock.findById.mockResolvedValueOnce(schuleOrg).mockResolvedValueOnce(schuleOrg2);

                await expect(service.createUserExternalResponse(sub)).rejects.toThrow(
                    new ForbiddenException('User has more than one SCHULE organisation'),
                );
            });
        });

        describe('when user has multiple KLASSE organisations', () => {
            it('should return all klasse organisations in response', async () => {
                const klasseOrg2: Organisation<true> = DoFactory.createOrganisation(true, {
                    typ: OrganisationsTyp.KLASSE,
                    externalIds: { LDAP: faker.string.uuid() },
                    name: faker.company.name(),
                });

                const schulePersonenkontext: Personenkontext<true> = DoFactory.createPersonenkontext(true, {
                    personId: person.id,
                    rolleId: personenkontext.rolleId,
                    organisationId: schuleOrg.id,
                });

                const klassePersonenkontext1: Personenkontext<true> = DoFactory.createPersonenkontext(true, {
                    personId: person.id,
                    rolleId: personenkontext.rolleId,
                    organisationId: klasseOrg.id,
                });

                const klassePersonenkontext2: Personenkontext<true> = DoFactory.createPersonenkontext(true, {
                    personId: person.id,
                    rolleId: personenkontext.rolleId,
                    organisationId: klasseOrg2.id,
                });

                personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([
                    schulePersonenkontext,
                    klassePersonenkontext1,
                    klassePersonenkontext2,
                ]);
                rolleRepoMock.findById.mockResolvedValue(rolle);
                organisationRepositoryMock.findById
                    .mockResolvedValueOnce(schuleOrg)
                    .mockResolvedValueOnce(klasseOrg)
                    .mockResolvedValueOnce(klasseOrg2);

                const result: UserExternalDataResponse = await service.createUserExternalResponse(sub);

                expect(result.klasseData).toHaveLength(2);
                expect(result.klasseData).toEqual(
                    expect.arrayContaining([
                        { name: klasseOrg.name, externalId: klasseOrg.externalIds?.LDAP, erwinId: klasseOrg.id },
                        { name: klasseOrg2.name, externalId: klasseOrg2.externalIds?.LDAP, erwinId: klasseOrg2.id },
                    ]),
                );
            });
        });

        describe('when person has no LDAP externalId', () => {
            it('should return undefined for person externalId', async () => {
                const personWithoutLdap: Person<true> = DoFactory.createPerson(true, {
                    keycloakUserId: sub,
                    externalIds: {},
                    email: faker.internet.email(),
                });

                personRepoMock.findByKeycloakUserId.mockResolvedValue(personWithoutLdap);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                rolleRepoMock.findById.mockResolvedValue(rolle);
                organisationRepositoryMock.findById.mockResolvedValue(schuleOrg);

                const result: UserExternalDataResponse = await service.createUserExternalResponse(sub);

                expect(result.personData.externalId).toBeUndefined();
            });
        });

        describe('when person has no email', () => {
            it('should return empty string for person email', async () => {
                const personWithoutEmail: Person<true> = DoFactory.createPerson(true, {
                    keycloakUserId: sub,
                    externalIds: { LDAP: faker.string.uuid() },
                    email: undefined,
                });

                personRepoMock.findByKeycloakUserId.mockResolvedValue(personWithoutEmail);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                rolleRepoMock.findById.mockResolvedValue(rolle);
                organisationRepositoryMock.findById.mockResolvedValue(schuleOrg);

                const result: UserExternalDataResponse = await service.createUserExternalResponse(sub);

                expect(result.personData.email).toEqual('');
            });
        });

        describe('when person has no vorname', () => {
            it('should return empty string for person vorname', async () => {
                const personWithoutVorname: Person<true> = DoFactory.createPerson(true, {
                    keycloakUserId: sub,
                    externalIds: { LDAP: faker.string.uuid() },
                    vorname: undefined as unknown as string,
                });

                personRepoMock.findByKeycloakUserId.mockResolvedValue(personWithoutVorname);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                rolleRepoMock.findById.mockResolvedValue(rolle);
                organisationRepositoryMock.findById.mockResolvedValue(schuleOrg);

                const result: UserExternalDataResponse = await service.createUserExternalResponse(sub);

                expect(result.personData.vorname).toEqual('');
            });
        });

        describe('when person has no familienname', () => {
            it('should return empty string for person familienname', async () => {
                const personWithoutFamilienname: Person<true> = DoFactory.createPerson(true, {
                    keycloakUserId: sub,
                    externalIds: { LDAP: faker.string.uuid() },
                    familienname: undefined as unknown as string,
                });

                personRepoMock.findByKeycloakUserId.mockResolvedValue(personWithoutFamilienname);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                rolleRepoMock.findById.mockResolvedValue(rolle);
                organisationRepositoryMock.findById.mockResolvedValue(schuleOrg);

                const result: UserExternalDataResponse = await service.createUserExternalResponse(sub);

                expect(result.personData.familienname).toEqual('');
            });
        });

        describe('when organisation type is neither SCHULE nor KLASSE', () => {
            it('should throw EntityNotFoundError due to no schule', async () => {
                const sonstigeOrg: Organisation<true> = DoFactory.createOrganisation(true, {
                    typ: OrganisationsTyp.SONSTIGE,
                    externalIds: { LDAP: faker.string.uuid() },
                    name: faker.company.name(),
                });

                personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                rolleRepoMock.findById.mockResolvedValue(rolle);
                organisationRepositoryMock.findById.mockResolvedValue(sonstigeOrg);

                await expect(service.createUserExternalResponse(sub)).rejects.toThrow(EntityNotFoundError);
            });
        });

        describe('when rolle has no rollenart', () => {
            it('should default to RollenArt.EXTERN', async () => {
                const rolleWithoutRollenart: Rolle<true> = DoFactory.createRolle(true, {
                    id: personenkontext.rolleId,
                    rollenart: undefined as unknown as RollenArt,
                });

                personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                rolleRepoMock.findById.mockResolvedValue(rolleWithoutRollenart);
                organisationRepositoryMock.findById.mockResolvedValue(schuleOrg);

                const result: UserExternalDataResponse = await service.createUserExternalResponse(sub);

                expect(result.personData.rolle).toEqual(RollenArt.EXTERN);
            });
        });

        describe('when exactly one SCHULE organisation exists', () => {
            it('should not throw ForbiddenException', async () => {
                personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                rolleRepoMock.findById.mockResolvedValue(rolle);
                organisationRepositoryMock.findById.mockResolvedValue(schuleOrg);

                await expect(service.createUserExternalResponse(sub)).resolves.not.toThrow();

                const result: UserExternalDataResponse = await service.createUserExternalResponse(sub);
                expect(result.schuleData).toBeDefined();
            });
        });

        describe('when no SCHULE organisation exists', () => {
            it('should throw EntityNotFoundError', async () => {
                personRepoMock.findByKeycloakUserId.mockResolvedValue(person);
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([personenkontext]);
                rolleRepoMock.findById.mockResolvedValue(rolle);
                organisationRepositoryMock.findById.mockResolvedValue(klasseOrg);

                await expect(service.createUserExternalResponse(sub)).rejects.toThrow(EntityNotFoundError);
            });
        });
    });
});
