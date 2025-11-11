import { EntityManager, MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RollenMappingRepo } from './rollenmapping.repo.js';
import {
    ConfigTestModule,
    DatabaseTestModule,
    DEFAULT_TIMEOUT_FOR_TESTCONTAINERS,
    DoFactory,
    LoggingTestModule,
    MapperTestModule,
} from '../../../../test/utils/index.js';
import { RollenMappingFactory } from '../domain/rollenmapping.factory.js';
import { RollenMapping } from '../domain/rollenmapping.js';
import { RolleRepo } from '../../rolle/repo/rolle.repo.js';
import { Rolle } from '../../rolle/domain/rolle.js';
import { DomainError } from '../../../shared/error/domain.error.js';
import { ServiceProvider } from '../../service-provider/domain/service-provider.js';
import { ServiceProviderRepo } from '../../service-provider/repo/service-provider.repo.js';
import { RolleModule } from '../../rolle/rolle.module.js';
import { ServiceProviderModule } from '../../service-provider/service-provider.module.js';
import { faker } from '@faker-js/faker';

describe('RollenMappingRepo', () => {
    let module: TestingModule;
    let sut: RollenMappingRepo;
    let orm: MikroORM;
    let em: EntityManager;
    let rolleRepo: RolleRepo;
    let serviceProviderRepo: ServiceProviderRepo;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                ConfigTestModule,
                LoggingTestModule,
                DatabaseTestModule.forRoot({ isDatabaseRequired: true }),
                MapperTestModule,
                RolleModule,
                ServiceProviderModule,
            ],
            providers: [RollenMappingRepo, RollenMappingFactory, RolleRepo, ServiceProviderRepo],
        }).compile();

        sut = module.get(RollenMappingRepo);
        orm = module.get(MikroORM);
        em = module.get(EntityManager);
        rolleRepo = module.get(RolleRepo);
        serviceProviderRepo = module.get(ServiceProviderRepo);

        await DatabaseTestModule.setupDatabase(orm);
    }, DEFAULT_TIMEOUT_FOR_TESTCONTAINERS);

    async function getSavedRolle(): Promise<Rolle<true>> {
        const newRolle: Rolle<false> = DoFactory.createRolle(false);
        const savedRolle: Rolle<true> | DomainError = await rolleRepo.save(newRolle);

        if (savedRolle instanceof DomainError) {
            throw new Error();
        }

        return savedRolle;
    }

    async function getSavedServiceProvider(): Promise<ServiceProvider<true>> {
        const newServiceProvider: ServiceProvider<false> = DoFactory.createServiceProvider(false);
        const savedServiceProvider: ServiceProvider<true> | DomainError =
            await serviceProviderRepo.save(newServiceProvider);

        if (savedServiceProvider instanceof DomainError) {
            throw new Error();
        }

        return savedServiceProvider;
    }

    async function getSavedRollenMapping(): Promise<RollenMapping<true>> {
        const rolle: Rolle<true> = await getSavedRolle();
        const serviceProvider: ServiceProvider<true> = await getSavedServiceProvider();
        const newMapping: RollenMapping<false> = DoFactory.createRollenMapping(false, {
            rolleId: rolle.id,
            serviceProviderId: serviceProvider.id,
        });
        const savedMapping: RollenMapping<true> = await sut.save(newMapping);

        return savedMapping;
    }

    afterAll(async () => {
        await orm.close();
        await module.close();
    });

    beforeEach(async () => {
        await DatabaseTestModule.clearDatabase(orm);
    });

    it('should be defined', () => {
        expect(sut).toBeDefined();
        expect(em).toBeDefined();
    });

    describe('findById', () => {
        describe('when RollenMapping with the given id exists', () => {
            it('should return the RollenMapping', async () => {
                const savedMapping: RollenMapping<true> = await getSavedRollenMapping();
                const foundMapping: Option<RollenMapping<true>> = await sut.findById(savedMapping.id);

                expect(foundMapping).toBeDefined();
                if (!foundMapping) throw Error();
                expect(foundMapping.id).toBe(savedMapping.id);
            });
        });

        describe('when RollenMapping with the given id does not exist', () => {
            it('should return null', async () => {
                const foundMapping: Option<RollenMapping<true>> = await sut.findById(faker.string.uuid());

                expect(foundMapping).toBeNull();
            });
        });
    });

    describe('findByRolleId', () => {
        describe('when RollenMapping with the given rolleId exists', () => {
            it('should return the RollenMapping', async () => {
                const savedMapping: RollenMapping<true> = await getSavedRollenMapping();
                const foundMapping: Option<RollenMapping<true>> = await sut.findByRolleId(savedMapping.rolleId);

                expect(foundMapping).toBeDefined();
                if (!foundMapping) throw Error();
                expect(foundMapping.id).toBe(savedMapping.id);
            });
            describe('when no RollenMapping exists for the given rolleId', () => {
                it('should throw an error if no RollenMapping exists for the given rolleId', async () => {
                    const nonExistentRolleId: string = faker.string.uuid();
                    await expect(sut.findByRolleId(nonExistentRolleId)).rejects.toThrow(
                        'No rollenMapping found for the given rolleId',
                    );
                });
            });
        });
    });

    describe('find', () => {
        describe('when finding RollenMappings', () => {
            it('should return all RollenMappings', async () => {
                const savedMappings: RollenMapping<true>[] = [
                    await getSavedRollenMapping(),
                    await getSavedRollenMapping(),
                    await getSavedRollenMapping(),
                ];

                const foundMappings: RollenMapping<true>[] = await sut.find();

                expect(foundMappings.length).toBe(savedMappings.length);
            });
        });
    });

    describe('create', () => {
        describe('when saving a new RollenMapping with rolleId that has RollenMapping', () => {
            it('should throw an error', async () => {
                const serviceProvider: ServiceProvider<true> = await getSavedServiceProvider();
                const existingMapping: RollenMapping<true> = await getSavedRollenMapping();
                const newMapping: RollenMapping<false> = DoFactory.createRollenMapping(false, {
                    rolleId: existingMapping.rolleId,
                    serviceProviderId: serviceProvider.id,
                });

                await expect(sut.save(newMapping)).rejects.toThrow();
            });
        });
    });

    describe('save', () => {
        describe('when saving a new RollenMapping', () => {
            it('should assign an id', async () => {
                const rolle: Rolle<true> = await getSavedRolle();
                const serviceProvider: ServiceProvider<true> = await getSavedServiceProvider();

                const newMapping: RollenMapping<false> = DoFactory.createRollenMapping(false, {
                    rolleId: rolle.id,
                    serviceProviderId: serviceProvider.id,
                });
                const savedMapping: RollenMapping<true> = await sut.save(newMapping);

                expect(savedMapping.id).toBeDefined();
            });
        });

        describe('when saving an existing RollenMapping', () => {
            it('should keep id and update data', async () => {
                const existingMapping: RollenMapping<true> = await getSavedRollenMapping();

                const newName: string = faker.string.alpha();
                existingMapping.mapToLmsRolle = newName;

                const savedMapping: RollenMapping<true> = await sut.save(existingMapping);

                expect(savedMapping.id).toBe(existingMapping.id);
                expect(savedMapping.mapToLmsRolle).toBe(newName);
            });
        });
    });

    describe('delete', () => {
        describe('when RollenMapping exists', () => {
            it('should not throw', async () => {
                const savedMapping: RollenMapping<true> = await getSavedRollenMapping();

                await expect(sut.delete(savedMapping.id)).resolves.not.toThrow();
            });
        });
    });

    describe('findByServiceProviderId', () => {
        describe('findByServiceProviderId', () => {
            it('should return all RollenMappings for a given serviceProviderId', async () => {
                const rolle: Rolle<true> = await getSavedRolle();
                const serviceProvider: ServiceProvider<true> = await getSavedServiceProvider();

                const mapping: RollenMapping<false> = DoFactory.createRollenMapping(false, {
                    rolleId: rolle.id,
                    serviceProviderId: serviceProvider.id,
                });
                const savedMapping: RollenMapping<true> = await sut.save(mapping);

                const foundMappings: RollenMapping<true>[] = await sut.findByServiceProviderId(serviceProvider.id);

                expect(foundMappings).toHaveLength(1);
                const foundIds: string[] = foundMappings.map((m: RollenMapping<true>) => m.id);
                expect(foundIds).toContain(savedMapping.id);
            });

            it('should return an empty array if no RollenMappings exist for the given serviceProviderId', async () => {
                const nonExistentServiceProviderId: string = faker.string.uuid();
                const foundMappings: RollenMapping<true>[] =
                    await sut.findByServiceProviderId(nonExistentServiceProviderId);

                expect(foundMappings).toEqual([]);
            });
        });
    });
});
