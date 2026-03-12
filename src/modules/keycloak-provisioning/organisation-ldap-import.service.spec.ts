import { Test, TestingModule } from '@nestjs/testing';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { ClassLogger } from '../../core/logging/class-logger.js';
import { OrganisationRepository } from '../organisation/persistence/organisation.repository.js';
import { Organisation } from '../organisation/domain/organisation.js';
import { SchuleLdapImportBodyParams } from './ldap/schule-ldap-import.body.params.js';
import { KlasseLdapImportBodyParams } from './ldap/klasse-ldap-import.body.params.js';
import { OrganisationExternalIdType, OrganisationsTyp } from '../organisation/domain/organisation.enums.js';
import { faker } from '@faker-js/faker';
import { DoFactory } from '../../../test/utils/do-factory.js';
import { OrganisationLdapImportService } from './organisation-ldap-import.service.js';

describe('OrganisationLdapImportService', () => {
    let service: OrganisationLdapImportService;
    let organisationRepositoryMock: DeepMocked<OrganisationRepository>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrganisationLdapImportService,
                { provide: ClassLogger, useValue: createMock<ClassLogger>() },
                { provide: OrganisationRepository, useValue: createMock<OrganisationRepository>() },
            ],
        }).compile();

        service = module.get(OrganisationLdapImportService);
        organisationRepositoryMock = module.get(OrganisationRepository);
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

                organisationRepositoryMock.findOrganisationByExternalId.mockResolvedValue(orgWithUndefinedExternalIds);
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

                const result: Organisation<true> = await service.findOrCreateSchuleParentOrg(
                    schuleOrg,
                    faker.string.uuid(),
                );

                expect(organisationRepositoryMock.findBy).toHaveBeenCalled();
                expect(organisationRepositoryMock.save).toHaveBeenCalledTimes(2);
                expect(result).toEqual(persistedParentOrg);
            });

            it('should update schuleOrg administriertVon and zugehoerigZu', async () => {
                organisationRepositoryMock.findBy.mockResolvedValueOnce(emptyCounted);
                organisationRepositoryMock.save.mockResolvedValueOnce(persistedParentOrg);
                organisationRepositoryMock.save.mockResolvedValueOnce(schuleOrg);

                await service.findOrCreateSchuleParentOrg(schuleOrg, faker.string.uuid());

                expect(schuleOrg.zugehoerigZu).toEqual(persistedParentOrg.id);
                expect(schuleOrg.administriertVon).toEqual(persistedParentOrg.id);
            });
        });

        describe('when parent organisation exists', () => {
            it('should update schuleOrg administriertVon and zugehoerigZu and return existing parent org', async () => {
                organisationRepositoryMock.findBy.mockResolvedValue([[parentOrg], 1] as Counted<Organisation<true>>);
                organisationRepositoryMock.save.mockResolvedValue(schuleOrg);

                const result: Organisation<true> = await service.findOrCreateSchuleParentOrg(
                    schuleOrg,
                    faker.string.uuid(),
                );

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

                await expect(service.findOrCreateSchuleParentOrg(schuleOrg, faker.string.uuid())).rejects.toThrow(
                    'More than one organisation exists',
                );
                expect(organisationRepositoryMock.findBy).toHaveBeenCalled();
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
});
