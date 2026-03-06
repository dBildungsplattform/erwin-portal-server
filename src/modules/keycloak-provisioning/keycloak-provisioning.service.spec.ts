import { Test, TestingModule } from '@nestjs/testing';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { ClassLogger } from '../../core/logging/class-logger.js';
import { PersonRepository } from '../person/persistence/person.repository.js';
import { PersonFactory } from '../person/domain/person.factory.js';
import { OrganisationRepository } from '../organisation/persistence/organisation.repository.js';
import { RolleFactory } from '../rolle/domain/rolle.factory.js';
import { PersonenkontextFactory } from '../personenkontext/domain/personenkontext.factory.js';
import { PersonenkontextService } from '../personenkontext/domain/personenkontext.service.js';
import { DBiamPersonenkontextRepoInternal } from '../personenkontext/persistence/internal-dbiam-personenkontext.repo.js';
import { RolleRepo } from '../rolle/repo/rolle.repo.js';
import { Organisation } from '../organisation/domain/organisation.js';
import { Person } from '../person/domain/person.js';
import { Rolle } from '../rolle/domain/rolle.js';
import { Personenkontext } from '../personenkontext/domain/personenkontext.js';
import { SchuleLdapImportBodyParams } from './ldap/schule-ldap-import.body.params.js';
import { PersonLdapImportDataBody } from './ldap/person-ldap-import.body.params.js';
import { KlasseLdapImportBodyParams } from './ldap/klasse-ldap-import.body.params.js';
import { LdapUserDataBodyParams } from './ldap/ldap-user-data.body.params.js';
import { OrganisationExternalIdType, OrganisationsTyp } from '../organisation/domain/organisation.enums.js';
import { DomainError } from '../../shared/error/index.js';
import { ErwinLdapMappedRollenArt } from '../rollenmapping/domain/lms-rollenarten.enums.js';
import { RollenArt } from '../rolle/domain/rolle.enums.js';
import { faker } from '@faker-js/faker';
import { DoFactory } from '../../../test/utils/do-factory.js';
import { ForbiddenException } from '@nestjs/common';
import { KeycloakProvisioningService } from './keycloak-provisioning.service.js';

describe('KeycloakProvisioningService', () => {
    let service: KeycloakProvisioningService;
    let personRepositoryMock: DeepMocked<PersonRepository>;
    let personFactoryMock: DeepMocked<PersonFactory>;
    let organisationRepositoryMock: DeepMocked<OrganisationRepository>;
    let rolleFactoryMock: DeepMocked<RolleFactory>;
    let personenkontextFactoryMock: DeepMocked<PersonenkontextFactory>;
    let personenkontextServiceMock: DeepMocked<PersonenkontextService>;
    let personenkontextRepoMock: DeepMocked<DBiamPersonenkontextRepoInternal>;
    let rolleRepoMock: DeepMocked<RolleRepo>;

    class TestDomainError extends DomainError {
        public constructor(message: string, code: string) {
            super(message, code);
        }
    }

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                KeycloakProvisioningService,
                { provide: ClassLogger, useValue: createMock<ClassLogger>() },
                { provide: PersonRepository, useValue: createMock<PersonRepository>() },
                { provide: PersonFactory, useValue: createMock<PersonFactory>() },
                { provide: OrganisationRepository, useValue: createMock<OrganisationRepository>() },
                { provide: RolleFactory, useValue: createMock<RolleFactory>() },
                { provide: PersonenkontextFactory, useValue: createMock<PersonenkontextFactory>() },
                { provide: PersonenkontextService, useValue: createMock<PersonenkontextService>() },
                { provide: DBiamPersonenkontextRepoInternal, useValue: createMock<DBiamPersonenkontextRepoInternal>() },
                { provide: RolleRepo, useValue: createMock<RolleRepo>() },
            ],
        }).compile();

        service = module.get(KeycloakProvisioningService);
        personRepositoryMock = module.get(PersonRepository);
        personFactoryMock = module.get(PersonFactory);
        organisationRepositoryMock = module.get(OrganisationRepository);
        rolleFactoryMock = module.get(RolleFactory);
        personenkontextFactoryMock = module.get(PersonenkontextFactory);
        personenkontextServiceMock = module.get(PersonenkontextService);
        personenkontextRepoMock = module.get(DBiamPersonenkontextRepoInternal);
        rolleRepoMock = module.get(RolleRepo);
    });

    describe('Service Methods', () => {
        describe('importLdapUser', () => {
            let ldapUserDataParams: LdapUserDataBodyParams;
            let schuleOrg: Organisation<true>;
            let parentOrg: Organisation<true>;
            let klasseOrg: Organisation<true>;
            let person: Person<true>;
            let rolle: Rolle<true>;
            let personenkontext: Personenkontext<true>;

            beforeEach(() => {
                schuleOrg = DoFactory.createOrganisation(true, {
                    id: faker.string.uuid(),
                    name: faker.company.name(),
                    typ: OrganisationsTyp.SCHULE,
                    externalIds: { LDAP: faker.string.uuid() },
                });

                parentOrg = DoFactory.createOrganisation(true, {
                    id: faker.string.uuid(),
                    name: `${schuleOrg.externalIds?.LDAP} Parent Org`,
                    typ: OrganisationsTyp.LAND,
                });

                klasseOrg = DoFactory.createOrganisation(true, {
                    id: faker.string.uuid(),
                    name: faker.lorem.word(),
                    typ: OrganisationsTyp.KLASSE,
                });

                person = DoFactory.createPerson(true, {
                    id: faker.string.uuid(),
                    familienname: faker.person.lastName(),
                    vorname: faker.person.firstName(),
                    keycloakUserId: faker.string.uuid(),
                });

                rolle = DoFactory.createRolle(true, {
                    id: faker.string.uuid(),
                    name: parentOrg.name,
                    administeredBySchulstrukturknoten: parentOrg.id,
                    rollenart: RollenArt.LEHR,
                });

                personenkontext = DoFactory.createPersonenkontext(true, {
                    personId: person.id,
                    organisationId: schuleOrg.id,
                    rolleId: rolle.id,
                });

                ldapUserDataParams = {
                    schuleParams: {
                        name: schuleOrg.name,
                        externalId: schuleOrg.externalIds?.LDAP as string,
                        zugehoerigZu: faker.string.uuid(),
                    } as SchuleLdapImportBodyParams,
                    klasseParams: {
                        name: klasseOrg.name,
                        externalId: faker.string.uuid(),
                    } as KlasseLdapImportBodyParams,
                    personParams: {
                        keycloakUserId: person.keycloakUserId as string,
                        vorname: person.vorname,
                        nachname: person.familienname,
                        externalId: faker.string.uuid(),
                        email: faker.internet.email(),
                        geburtstag: faker.date.birthdate(),
                    } as PersonLdapImportDataBody,
                    role: ErwinLdapMappedRollenArt.LEHR,
                } as LdapUserDataBodyParams;
            });

            it('should successfully import a user with all related entities', async () => {
                // Schule
                organisationRepositoryMock.findOrganisationByExternalId.mockResolvedValueOnce(null);
                organisationRepositoryMock.save.mockResolvedValueOnce(schuleOrg);
                organisationRepositoryMock.createExternalIdOrganisationMapping.mockResolvedValueOnce(undefined);

                // Parent Org
                organisationRepositoryMock.findBy.mockResolvedValueOnce([[], 0] as Counted<Organisation<true>>);
                organisationRepositoryMock.save.mockResolvedValueOnce(parentOrg);
                organisationRepositoryMock.save.mockResolvedValueOnce(schuleOrg);

                // Person
                personRepositoryMock.findByKeycloakUserId.mockResolvedValueOnce(undefined);
                personFactoryMock.createNew.mockResolvedValueOnce(DoFactory.createPerson(false));
                personRepositoryMock.create.mockResolvedValueOnce(person);

                // Rolle
                rolleRepoMock.findByName.mockResolvedValueOnce(undefined);
                rolleFactoryMock.createNew.mockReturnValueOnce(DoFactory.createRolle(false));
                rolleRepoMock.save.mockResolvedValueOnce(rolle);

                // Personenkontext for Schule
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValueOnce([]);
                personenkontextFactoryMock.createNew.mockReturnValueOnce(DoFactory.createPersonenkontext(false));
                personenkontextRepoMock.save.mockResolvedValueOnce(personenkontext);

                // Klasse
                organisationRepositoryMock.findOrganisationByExternalId.mockResolvedValueOnce(null);
                organisationRepositoryMock.save.mockResolvedValueOnce(klasseOrg);
                organisationRepositoryMock.createExternalIdOrganisationMapping.mockResolvedValueOnce(undefined);

                // Personenkontext for Klasse
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValueOnce([]);
                personenkontextFactoryMock.createNew.mockReturnValueOnce(DoFactory.createPersonenkontext(false));
                personenkontextRepoMock.save.mockResolvedValueOnce(personenkontext);

                await expect(service.importLdapUser(ldapUserDataParams)).resolves.toBeUndefined();

                expect(organisationRepositoryMock.findOrganisationByExternalId).toHaveBeenCalledTimes(2);
                expect(personRepositoryMock.findByKeycloakUserId).toHaveBeenCalledWith(
                    ldapUserDataParams.personParams.keycloakUserId,
                );
                expect(rolleRepoMock.findByName).toHaveBeenCalled();
                expect(personenkontextServiceMock.findPersonenkontexteByPersonId).toHaveBeenCalledTimes(2);
            });

            it('should import an existing user and update all related entities', async () => {
                // Schule exists
                organisationRepositoryMock.findOrganisationByExternalId.mockResolvedValueOnce(schuleOrg);
                organisationRepositoryMock.save.mockResolvedValueOnce(schuleOrg);

                // Parent Org exists
                organisationRepositoryMock.findBy.mockResolvedValueOnce([[parentOrg], 1] as Counted<
                    Organisation<true>
                >);
                organisationRepositoryMock.save.mockResolvedValueOnce(schuleOrg);

                // Person exists
                personRepositoryMock.findByKeycloakUserId.mockResolvedValueOnce(person);
                personRepositoryMock.update.mockResolvedValueOnce(person);

                // Rolle exists
                rolleRepoMock.findByName.mockResolvedValueOnce([rolle]);

                // Personenkontext for Schule exists
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValueOnce([personenkontext]);

                // Klasse exists
                organisationRepositoryMock.findOrganisationByExternalId.mockResolvedValueOnce(klasseOrg);
                organisationRepositoryMock.save.mockResolvedValueOnce(klasseOrg);

                // Personenkontext for Klasse exists
                const klassePersonenkontext: Personenkontext<true> = DoFactory.createPersonenkontext(true, {
                    personId: person.id,
                    organisationId: klasseOrg.id,
                    rolleId: rolle.id,
                });
                personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValueOnce([
                    klassePersonenkontext,
                ]);

                await expect(service.importLdapUser(ldapUserDataParams)).resolves.toBeUndefined();

                expect(organisationRepositoryMock.findOrganisationByExternalId).toHaveBeenCalledTimes(2);
                expect(personRepositoryMock.findByKeycloakUserId).toHaveBeenCalledWith(
                    ldapUserDataParams.personParams.keycloakUserId,
                );
                expect(personRepositoryMock.update).toHaveBeenCalled();
            });
        });

        describe('createOrUpdateSchuleOrg', () => {
            let schuleLdapParams: SchuleLdapImportBodyParams;
            let existingOrganisation: Organisation<true>;
            let persistedOrganisation: Organisation<true>;

            beforeEach(() => {
                schuleLdapParams = {
                    name: faker.company.name(),
                    externalId: faker.string.uuid(),
                    zugehoerigZu: faker.string.uuid(),
                };

                existingOrganisation = DoFactory.createOrganisation(true, {
                    name: faker.company.name(),
                    zugehoerigZu: faker.string.uuid(),
                });

                persistedOrganisation = DoFactory.createOrganisation(true, {
                    name: schuleLdapParams.name,
                    externalIds: { [OrganisationExternalIdType.LDAP]: schuleLdapParams.externalId },
                });
            });

            describe('when organisation does not exist', () => {
                it('should create a new schule organisation and mapping', async () => {
                    organisationRepositoryMock.findOrganisationByExternalId.mockResolvedValue(null);
                    organisationRepositoryMock.save.mockResolvedValue(persistedOrganisation);

                    const result: Organisation<true> = await service.createOrUpdateSchuleOrg(schuleLdapParams);

                    expect(organisationRepositoryMock.findOrganisationByExternalId).toHaveBeenCalledWith(
                        schuleLdapParams.externalId,
                        OrganisationExternalIdType.LDAP,
                    );
                    expect(organisationRepositoryMock.save).toHaveBeenCalled();
                    expect(organisationRepositoryMock.createExternalIdOrganisationMapping).toHaveBeenCalledWith(
                        schuleLdapParams.externalId,
                        OrganisationExternalIdType.LDAP,
                        persistedOrganisation,
                    );
                    expect(result).toEqual(persistedOrganisation);
                });
            });

            describe('when organisation exists', () => {
                it('should update the existing schule organisation', async () => {
                    organisationRepositoryMock.findOrganisationByExternalId.mockResolvedValue(existingOrganisation);
                    organisationRepositoryMock.save.mockResolvedValue(persistedOrganisation);

                    const result: Organisation<true> = await service.createOrUpdateSchuleOrg(schuleLdapParams);

                    expect(organisationRepositoryMock.findOrganisationByExternalId).toHaveBeenCalledWith(
                        schuleLdapParams.externalId,
                        OrganisationExternalIdType.LDAP,
                    );
                    expect(organisationRepositoryMock.save).toHaveBeenCalledWith(existingOrganisation);
                    expect(result).toEqual(persistedOrganisation);
                    expect(existingOrganisation.name).toEqual(schuleLdapParams.name);
                    expect(existingOrganisation.externalIds?.LDAP).toEqual(schuleLdapParams.externalId);
                    expect(existingOrganisation.zugehoerigZu).toEqual(schuleLdapParams.zugehoerigZu);
                });
            });

            describe('when an organisation exists and its externalIds record is defined with a previous value', () => {
                it('should update the LDAP value in the record using the LDAP type', async () => {
                    existingOrganisation.externalIds = { [OrganisationExternalIdType.LDAP]: faker.string.uuid() };

                    organisationRepositoryMock.findOrganisationByExternalId.mockResolvedValue(existingOrganisation);
                    organisationRepositoryMock.save.mockResolvedValue(persistedOrganisation);

                    await service.createOrUpdateSchuleOrg(schuleLdapParams);

                    expect(persistedOrganisation.externalIds).toBeDefined();
                    expect(persistedOrganisation.externalIds?.LDAP).toEqual(schuleLdapParams.externalId);
                });
            });

            describe('when an organisation exists and its externalIds record is undefined', () => {
                it('should initialize the externalIds record with the LDAP value', async () => {
                    const orgWithUndefinedExternalIds: Organisation<true> = DoFactory.createOrganisation(true, {
                        name: faker.company.name(),
                        zugehoerigZu: faker.string.uuid(),
                        externalIds: undefined,
                    });

                    organisationRepositoryMock.findOrganisationByExternalId.mockResolvedValue(
                        orgWithUndefinedExternalIds,
                    );
                    organisationRepositoryMock.save.mockResolvedValue(persistedOrganisation);

                    await service.createOrUpdateSchuleOrg(schuleLdapParams);

                    expect(orgWithUndefinedExternalIds.externalIds).toBeDefined();
                    expect(orgWithUndefinedExternalIds.externalIds).toEqual({
                        [OrganisationExternalIdType.LDAP]: schuleLdapParams.externalId,
                    });
                });
            });
        });

        describe('findOrCreateSchuleParentOrg', () => {
            let schuleOrg: Organisation<true>;
            let parentOrg: Organisation<true>;
            let persistedParentOrg: Organisation<true>;

            beforeEach(() => {
                schuleOrg = DoFactory.createOrganisation(true, {
                    id: faker.string.uuid(),
                    name: faker.company.name(),
                    externalIds: { LDAP: faker.string.uuid() },
                });
                parentOrg = DoFactory.createOrganisation(true, {
                    id: faker.string.uuid(),
                    name: `${schuleOrg.externalIds?.LDAP} Parent Org`,
                    typ: OrganisationsTyp.LAND,
                });
                persistedParentOrg = DoFactory.createOrganisation(true, {
                    id: faker.string.uuid(),
                    name: `${schuleOrg.externalIds?.LDAP} Parent Org`,
                    typ: OrganisationsTyp.LAND,
                });
            });

            describe('when parent organisation does not exist', () => {
                const emptyItems: Organisation<true>[] = [];
                const emptyCounted: Counted<Organisation<true>> = [emptyItems, 0];

                it('should create a new parent organisation', async () => {
                    organisationRepositoryMock.findBy.mockResolvedValue(emptyCounted);
                    organisationRepositoryMock.save.mockResolvedValueOnce(persistedParentOrg);

                    const result: Organisation<true> = await service.findOrCreateSchuleParentOrg(schuleOrg);

                    expect(organisationRepositoryMock.findBy).toHaveBeenCalled();
                    expect(organisationRepositoryMock.save).toHaveBeenCalledTimes(2);
                    expect(result).toEqual(persistedParentOrg);
                });

                it('should update schuleOrg administriertVon and zugehoerigZu', async () => {
                    organisationRepositoryMock.findBy.mockResolvedValueOnce(emptyCounted);
                    organisationRepositoryMock.save.mockResolvedValueOnce(persistedParentOrg);
                    organisationRepositoryMock.save.mockResolvedValueOnce(schuleOrg);

                    await service.findOrCreateSchuleParentOrg(schuleOrg);

                    expect(schuleOrg.zugehoerigZu).toEqual(persistedParentOrg.id);
                    expect(schuleOrg.administriertVon).toEqual(persistedParentOrg.id);
                });
            });

            describe('when parent organisation exists', () => {
                it('should update schuleOrg administriertVon and zugehoerigZu and return existing parent org', async () => {
                    organisationRepositoryMock.findBy.mockResolvedValue([[parentOrg], 1] as Counted<
                        Organisation<true>
                    >);
                    organisationRepositoryMock.save.mockResolvedValue(schuleOrg);

                    const result: Organisation<true> = await service.findOrCreateSchuleParentOrg(schuleOrg);

                    expect(organisationRepositoryMock.findBy).toHaveBeenCalled();
                    expect(organisationRepositoryMock.save).toHaveBeenCalledWith(schuleOrg);
                    expect(schuleOrg.zugehoerigZu).toEqual(parentOrg.id);
                    expect(schuleOrg.administriertVon).toEqual(parentOrg.id);
                    expect(result).toEqual(parentOrg);
                });
            });

            describe('when multiple parent organisations exist', () => {
                it('should throw ForbiddenException', async () => {
                    const orgs: Organisation<true>[] = [
                        DoFactory.createOrganisation(true, { typ: OrganisationsTyp.LAND }),
                        DoFactory.createOrganisation(true, { typ: OrganisationsTyp.LAND }),
                    ];
                    organisationRepositoryMock.findBy.mockResolvedValue([orgs, 2] as Counted<Organisation<true>>);

                    await expect(service.findOrCreateSchuleParentOrg(schuleOrg)).rejects.toThrow(
                        'More than one organisation exists',
                    );
                    expect(organisationRepositoryMock.findBy).toHaveBeenCalled();
                });
            });
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

        describe('findOrCreateRolle', () => {
            let parentOrg: Organisation<true>;
            let paramsRolle: ErwinLdapMappedRollenArt;
            let existingRolle: Rolle<true>;
            let persistedRolle: Rolle<true>;
            let newRolle: Rolle<false>;
            let domainError: DomainError;

            beforeEach(() => {
                parentOrg = DoFactory.createOrganisation(true, {
                    id: faker.string.uuid(),
                    name: faker.company.name(),
                });
                paramsRolle = ErwinLdapMappedRollenArt.LERN;
                existingRolle = DoFactory.createRolle(true, {
                    id: faker.string.uuid(),
                    name: parentOrg.name,
                    administeredBySchulstrukturknoten: parentOrg.id,
                    rollenart: RollenArt.LERN,
                });

                persistedRolle = DoFactory.createRolle(true, {
                    id: faker.string.uuid(),
                    name: parentOrg.name,
                    administeredBySchulstrukturknoten: parentOrg.id,
                });

                newRolle = DoFactory.createRolle(false, {
                    name: parentOrg.name,
                    administeredBySchulstrukturknoten: parentOrg.id,
                });

                domainError = new TestDomainError('creation failed', '500');
            });

            describe('when existing rollen are found', () => {
                it('should return the only rolle administered by the parentOrg', async () => {
                    const rollenList: Rolle<true>[] = [
                        DoFactory.createRolle(true, {
                            administeredBySchulstrukturknoten: faker.string.uuid(),
                            rollenart: RollenArt.LERN,
                        }),
                        existingRolle,
                    ];
                    rolleRepoMock.findByName.mockResolvedValue(rollenList);

                    const result: Rolle<true> = await service.findOrCreateRolle(parentOrg, paramsRolle);

                    expect(rolleRepoMock.findByName).toHaveBeenCalledWith(parentOrg.name, false);
                    expect(result).toEqual(existingRolle);
                });

                it('should return undefined if no rollen administered by parentOrg', async () => {
                    const rollenList: Rolle<true>[] = [
                        DoFactory.createRolle(true, {
                            administeredBySchulstrukturknoten: faker.string.uuid(),
                            rollenart: RollenArt.LERN,
                        }),
                    ];
                    rolleRepoMock.findByName.mockResolvedValue(rollenList);

                    const result: Rolle<true> = await service.findOrCreateRolle(parentOrg, paramsRolle);

                    expect(rolleRepoMock.findByName).toHaveBeenCalledWith(parentOrg.name, false);
                    expect(result).toBeUndefined();
                });

                it('should throw forbidden exception if more than 1 rolle is administered by parentOrg', async () => {
                    const rollenList: Rolle<true>[] = [
                        DoFactory.createRolle(true, {
                            administeredBySchulstrukturknoten: parentOrg.id,
                            rollenart: RollenArt.LERN,
                        }),
                        DoFactory.createRolle(true, {
                            administeredBySchulstrukturknoten: parentOrg.id,
                            rollenart: RollenArt.LERN,
                        }),
                    ];
                    rolleRepoMock.findByName.mockResolvedValue(rollenList);

                    await expect(service.findOrCreateRolle(parentOrg, paramsRolle)).rejects.toThrow(ForbiddenException);
                });
            });

            describe('when no existing rollen are found', () => {
                it('should create a new rolle and return the persisted rolle', async () => {
                    rolleRepoMock.findByName.mockResolvedValue(undefined);
                    rolleFactoryMock.createNew.mockReturnValue(newRolle);
                    rolleRepoMock.save.mockResolvedValue(persistedRolle);

                    const result: Rolle<true> = await service.findOrCreateRolle(parentOrg, paramsRolle);

                    expect(rolleRepoMock.findByName).toHaveBeenCalledWith(parentOrg.name as string, false);
                    expect(rolleFactoryMock.createNew).toHaveBeenCalledWith(
                        parentOrg.name,
                        parentOrg.id,
                        RollenArt.LERN,
                        [],
                        [],
                        [],
                        [],
                        false,
                    );
                    expect(rolleRepoMock.save).toHaveBeenCalledWith(newRolle);
                    expect(result).toEqual(persistedRolle);
                });

                describe('when rolleFactory.createNew returns a DomainError', () => {
                    it('should throw the DomainError', async () => {
                        rolleRepoMock.findByName.mockResolvedValue(undefined);
                        rolleFactoryMock.createNew.mockReturnValue(domainError);

                        await expect(service.findOrCreateRolle(parentOrg, paramsRolle)).rejects.toThrow(domainError);
                        expect(rolleFactoryMock.createNew).toHaveBeenCalled();
                        expect(rolleRepoMock.save).not.toHaveBeenCalled();
                    });
                });

                describe('when rolleRepo.save returns a DomainError', () => {
                    it('should throw the DomainError', async () => {
                        rolleRepoMock.findByName.mockResolvedValue(undefined);
                        rolleFactoryMock.createNew.mockReturnValue(newRolle);
                        rolleRepoMock.save.mockResolvedValue(domainError);

                        await expect(service.findOrCreateRolle(parentOrg, paramsRolle)).rejects.toThrow(domainError);
                        expect(rolleRepoMock.save).toHaveBeenCalledWith(newRolle);
                    });
                });

                describe('role mapping', () => {
                    it.each([
                        [ErwinLdapMappedRollenArt.LERN, RollenArt.LERN],
                        [ErwinLdapMappedRollenArt.LEHR, RollenArt.LEHR],
                        [ErwinLdapMappedRollenArt.LEIT, RollenArt.LEIT],
                    ])('should map %s to %s correctly', async (ldapRole, expectedRollenArt) => {
                        rolleRepoMock.findByName.mockResolvedValue(undefined);
                        rolleFactoryMock.createNew.mockReturnValue(newRolle);
                        rolleRepoMock.save.mockResolvedValue(persistedRolle);

                        await service.findOrCreateRolle(parentOrg, ldapRole);

                        expect(rolleFactoryMock.createNew).toHaveBeenCalledWith(
                            parentOrg.name,
                            parentOrg.id,
                            expectedRollenArt,
                            [],
                            [],
                            [],
                            [],
                            false,
                        );
                    });
                });
            });
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
                    expect(personenkontextFactoryMock.createNew).toHaveBeenCalledWith(
                        person.id,
                        schuleOrg.id,
                        rolle.id,
                    );
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

                    await expect(
                        service.createOrUpdatePersonenkontextForSchule(schuleOrg, rolle, person),
                    ).rejects.toThrow(
                        'more than one personenkontext exists for this person with the same organisation and role',
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

                        expect(personenkontextServiceMock.findPersonenkontexteByPersonId).toHaveBeenCalledWith(
                            person.id,
                        );
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

        describe('createOrUpdateKlasse', () => {
            let klasseLdapParams: KlasseLdapImportBodyParams;
            let schuleOrg: Organisation<true>;
            let persistedKlasseOrg: Organisation<true>;
            describe('when klasse organisation does not exist', () => {
                beforeEach(() => {
                    klasseLdapParams = {
                        name: faker.company.name(),
                        externalId: faker.string.uuid(),
                    };

                    schuleOrg = DoFactory.createOrganisation(true, {
                        id: faker.string.uuid(),
                        name: faker.company.name(),
                        typ: OrganisationsTyp.SCHULE,
                    });

                    persistedKlasseOrg = DoFactory.createOrganisation(true, {
                        name: klasseLdapParams.name,
                        externalIds: { [OrganisationExternalIdType.LDAP]: klasseLdapParams.externalId },
                        typ: OrganisationsTyp.KLASSE,
                        administriertVon: schuleOrg.id,
                        zugehoerigZu: schuleOrg.id,
                    });
                });

                it('should create a new klasse organisation and mapping', async () => {
                    organisationRepositoryMock.findOrganisationByExternalId.mockResolvedValue(null);
                    organisationRepositoryMock.save.mockResolvedValue(persistedKlasseOrg);

                    const result: Organisation<true> = await service.createOrUpdateKlasse(klasseLdapParams, schuleOrg);

                    expect(organisationRepositoryMock.findOrganisationByExternalId).toHaveBeenCalledWith(
                        klasseLdapParams.externalId,
                        OrganisationExternalIdType.LDAP,
                    );
                    expect(organisationRepositoryMock.save).toHaveBeenCalled();
                    expect(organisationRepositoryMock.createExternalIdOrganisationMapping).toHaveBeenCalledWith(
                        klasseLdapParams.externalId,
                        OrganisationExternalIdType.LDAP,
                        persistedKlasseOrg,
                    );
                    expect(result).toEqual(persistedKlasseOrg);
                });
            });

            describe('when klasse organisation exists', () => {
                let existingKlasseOrg: Organisation<true>;

                beforeEach(() => {
                    klasseLdapParams = {
                        name: faker.company.name(),
                        externalId: faker.string.uuid(),
                    } as KlasseLdapImportBodyParams;

                    schuleOrg = DoFactory.createOrganisation(true, {
                        id: faker.string.uuid(),
                        name: faker.company.name(),
                        typ: OrganisationsTyp.SCHULE,
                    });

                    existingKlasseOrg = DoFactory.createOrganisation(true, {
                        id: faker.string.uuid(),
                        name: faker.company.name(),
                        externalIds: { [OrganisationExternalIdType.LDAP]: klasseLdapParams.externalId },
                        typ: OrganisationsTyp.KLASSE,
                        administriertVon: schuleOrg.id,
                        zugehoerigZu: schuleOrg.id,
                    });

                    persistedKlasseOrg = DoFactory.createOrganisation(true, {
                        id: existingKlasseOrg.id,
                        name: klasseLdapParams.name,
                        externalIds: { [OrganisationExternalIdType.LDAP]: klasseLdapParams.externalId },
                        typ: OrganisationsTyp.KLASSE,
                        administriertVon: schuleOrg.id,
                        zugehoerigZu: schuleOrg.id,
                    });
                });

                it('should update the existing klasse organisation', async () => {
                    organisationRepositoryMock.findOrganisationByExternalId.mockResolvedValue(existingKlasseOrg);
                    organisationRepositoryMock.save.mockResolvedValue(persistedKlasseOrg);

                    const result: Organisation<true> = await service.createOrUpdateKlasse(klasseLdapParams, schuleOrg);

                    expect(organisationRepositoryMock.findOrganisationByExternalId).toHaveBeenCalledWith(
                        klasseLdapParams.externalId,
                        OrganisationExternalIdType.LDAP,
                    );
                    expect(organisationRepositoryMock.save).toHaveBeenCalledWith(existingKlasseOrg);
                    expect(result).toEqual(persistedKlasseOrg);
                    expect(existingKlasseOrg.name).toEqual(klasseLdapParams.name);
                    expect(existingKlasseOrg.externalIds?.LDAP).toEqual(klasseLdapParams.externalId);
                });

                it('should initialize externalIds record if it is undefined', async () => {
                    existingKlasseOrg.externalIds = undefined;

                    organisationRepositoryMock.findOrganisationByExternalId.mockResolvedValue(existingKlasseOrg);

                    organisationRepositoryMock.save.mockResolvedValue(persistedKlasseOrg);

                    const result: Organisation<true> = await service.createOrUpdateKlasse(klasseLdapParams, schuleOrg);

                    expect(organisationRepositoryMock.findOrganisationByExternalId).toHaveBeenCalledWith(
                        klasseLdapParams.externalId,
                        OrganisationExternalIdType.LDAP,
                    );
                    expect(organisationRepositoryMock.save).toHaveBeenCalledWith(existingKlasseOrg);
                    expect(result).toEqual(persistedKlasseOrg);
                    expect(persistedKlasseOrg.externalIds).toBeDefined();
                    expect(persistedKlasseOrg.externalIds).toEqual({
                        [OrganisationExternalIdType.LDAP]: klasseLdapParams.externalId,
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
                    expect(personenkontextFactoryMock.createNew).toHaveBeenCalledWith(
                        person.id,
                        klasseOrg.id,
                        rolle.id,
                    );
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
                    personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue(
                        existingPersonenkontexte,
                    );

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

                        expect(personenkontextServiceMock.findPersonenkontexteByPersonId).toHaveBeenCalledWith(
                            person.id,
                        );
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
                        ).rejects.toThrow(
                            'more than one personenkontext exists for this person with the same organisation and role',
                        );
                        expect(personenkontextServiceMock.findPersonenkontexteByPersonId).toHaveBeenCalledWith(
                            person.id,
                        );
                    });
                });
            });
        });
    });
});
