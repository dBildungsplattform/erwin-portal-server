import { Test, TestingModule } from '@nestjs/testing';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { ClassLogger } from '../../core/logging/class-logger.js';
import { RolleFactory } from '../rolle/domain/rolle.factory.js';
import { RolleRepo } from '../rolle/repo/rolle.repo.js';
import { Organisation } from '../organisation/domain/organisation.js';
import { Rolle } from '../rolle/domain/rolle.js';
import { DomainError } from '../../shared/error/index.js';
import { ErwinLdapMappedRollenArt } from '../rollenmapping/domain/lms-rollenarten.enums.js';
import { RollenArt } from '../rolle/domain/rolle.enums.js';
import { faker } from '@faker-js/faker';
import { DoFactory } from '../../../test/utils/do-factory.js';
import { ForbiddenException } from '@nestjs/common';
import { RolleLdapImportService } from './rolle-ldap-import.service.js';

describe('RolleLdapImportService', () => {
    let service: RolleLdapImportService;
    let rolleFactoryMock: DeepMocked<RolleFactory>;
    let rolleRepoMock: DeepMocked<RolleRepo>;

    class TestDomainError extends DomainError {
        public constructor(message: string, code: string) {
            super(message, code);
        }
    }

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RolleLdapImportService,
                { provide: ClassLogger, useValue: createMock<ClassLogger>() },
                { provide: RolleFactory, useValue: createMock<RolleFactory>() },
                { provide: RolleRepo, useValue: createMock<RolleRepo>() },
            ],
        }).compile();

        service = module.get(RolleLdapImportService);
        rolleFactoryMock = module.get(RolleFactory);
        rolleRepoMock = module.get(RolleRepo);
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

            it('should create new rolle if no rollen administered by parentOrg', async () => {
                const rollenList: Rolle<true>[] = [
                    DoFactory.createRolle(true, {
                        administeredBySchulstrukturknoten: faker.string.uuid(),
                        rollenart: RollenArt.LERN,
                    }),
                ];
                rolleRepoMock.findByName.mockResolvedValue(rollenList);
                rolleFactoryMock.createNew.mockReturnValue(newRolle);
                rolleRepoMock.save.mockResolvedValue(persistedRolle);

                const result: Rolle<true> = await service.findOrCreateRolle(parentOrg, paramsRolle);

                expect(rolleRepoMock.findByName).toHaveBeenCalledWith(parentOrg.name, false);
                expect(rolleFactoryMock.createNew).toHaveBeenCalled();
                expect(rolleRepoMock.save).toHaveBeenCalledWith(newRolle);
                expect(result).toEqual(persistedRolle);
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
                ])(
                    'should map %s to %s correctly',
                    async (ldapRole: ErwinLdapMappedRollenArt, expectedRollenArt: RollenArt) => {
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
                    },
                );
            });
        });
    });
});
