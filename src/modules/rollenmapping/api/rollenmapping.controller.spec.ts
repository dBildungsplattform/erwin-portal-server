import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { APP_PIPE } from '@nestjs/core';
import { TestingModule, Test } from '@nestjs/testing';
import { RollenMappingRepo } from '../repo/rollenmapping.repo.js';
import { RollenMappingFactory } from '../domain/rollenmapping.factory.js';
import { RollenMappingController } from './rollenmapping.controller.js';
import { PersonPermissions } from '../../authentication/domain/person-permissions.js';
import { faker } from '@faker-js/faker';
import { RollenMapping } from '../domain/rollenmapping.js';
import { GlobalValidationPipe } from '../../../shared/validation/global-validation.pipe.js';
import { LoggingTestModule } from '../../../../test/utils/logging-test.module.js';
import { MapperTestModule } from '../../../../test/utils/mapper-test.module.js';
import { DEFAULT_TIMEOUT_FOR_TESTCONTAINERS } from '../../../../test/utils/timeouts.js';
import { RollenMappingCreateBodyParams } from './rollenmapping-create-body.params.js';
import { ServiceProviderRepo } from '../../service-provider/repo/service-provider.repo.js';
import { ServiceProvider } from '../../service-provider/domain/service-provider.js';
import { DoFactory } from '../../../../test/utils/do-factory.js';

describe('RollenMapping API', () => {
    let rollenMappingRepoMock: DeepMocked<RollenMappingRepo>;
    let rollenMappingController: RollenMappingController;
    let rollenMappingFactoryMock: DeepMocked<RollenMappingFactory>;
    let permissionsMock: DeepMocked<PersonPermissions>;
    let serviceProviderRepoMock: DeepMocked<ServiceProviderRepo>;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [MapperTestModule, LoggingTestModule],
            providers: [
                {
                    provide: APP_PIPE,
                    useClass: GlobalValidationPipe,
                },
                {
                    provide: RollenMappingRepo,
                    useValue: createMock<RollenMappingRepo>(),
                },
                {
                    provide: RollenMappingFactory,
                    useValue: createMock<RollenMappingFactory>(),
                },
                {
                    provide: PersonPermissions,
                    useValue: createMock<PersonPermissions>(),
                },
                {
                    provide: ServiceProviderRepo,
                    useValue: createMock<ServiceProviderRepo>(),
                },
                RollenMappingController,
            ],
        }).compile();

        rollenMappingRepoMock = module.get(RollenMappingRepo);
        rollenMappingFactoryMock = module.get(RollenMappingFactory);
        rollenMappingController = module.get(RollenMappingController);
        permissionsMock = module.get(PersonPermissions);
        serviceProviderRepoMock = module.get(ServiceProviderRepo);
    }, DEFAULT_TIMEOUT_FOR_TESTCONTAINERS);

    beforeEach(() => {
        jest.resetAllMocks();
        rollenMappingFactoryMock.createNew.mockReturnValue({
            id: faker.string.uuid(),
            createdAt: new Date(),
            updatedAt: new Date(),
            rolleId: faker.string.uuid(),
            serviceProviderId: faker.string.uuid(),
            mapToLmsRolle: faker.string.uuid(),
        } as unknown as RollenMapping<false>);
        serviceProviderRepoMock.findById.mockReturnValue({
            id: faker.string.uuid(),
            createdAt: new Date(),
            updatedAt: new Date(),
            name: faker.company.name(),
            kategorie: 'ANGEBOTE',
            providedOnSchulstrukturknoten: faker.string.uuid(),
        } as unknown as Promise<Option<ServiceProvider<true>>>);
        permissionsMock.hasSystemrechtAtOrganisation.mockReset();
    });

    describe('getRollenMappingWithId', () => {
        describe('when called', () => {
            it('should return rollenMapping if permission and entity exist', async () => {
                const rollenMapping: RollenMapping<true> = {
                    id: faker.string.uuid(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: faker.string.uuid(),
                };
                permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.findById.mockResolvedValue(rollenMapping);

                const result: RollenMapping<true> = await rollenMappingController.getRollenMappingWithId(
                    rollenMapping.id,
                    permissionsMock,
                );
                expect(result).toStrictEqual(rollenMapping);
            });

            it('should throw ForbiddenException if permission is missing', async () => {
                const id: string = faker.string.uuid();
                permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(false);
                rollenMappingRepoMock.findById.mockResolvedValue({
                    id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: faker.string.uuid(),
                });

                await expect(rollenMappingController.getRollenMappingWithId(id, permissionsMock)).rejects.toThrow(
                    `Insufficient rights to retrieve the rollenMapping at this organization with id ${id}`,
                );
            });

            it('should throw NotFoundException if rollenMapping does not exist', async () => {
                const id: string = faker.string.uuid();
                permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.findById.mockResolvedValue(undefined);

                await expect(rollenMappingController.getRollenMappingWithId(id, permissionsMock)).rejects.toThrow(
                    `No rollenMapping object found with id ${id}`,
                );
            });
        });
    });

    describe('getAllAvailableRollenMapping', () => {
        describe('when called', () => {
            it('should return array if permission and entities exist', async () => {
                const rollenMappings: RollenMapping<true>[] = [
                    {
                        id: faker.string.uuid(),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        rolleId: faker.string.uuid(),
                        serviceProviderId: faker.string.uuid(),
                        mapToLmsRolle: faker.string.uuid(),
                    },
                ];
                permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.find.mockResolvedValue(rollenMappings);

                const result: RollenMapping<true>[] =
                    await rollenMappingController.getAllAvailableRollenMapping(permissionsMock);
                expect(result).toStrictEqual(rollenMappings);
            });

            it('should throw ForbiddenException if permission is missing', async () => {
                permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(false);
                rollenMappingRepoMock.find.mockResolvedValue([]);
                await expect(rollenMappingController.getAllAvailableRollenMapping(permissionsMock)).rejects.toThrow(
                    'No rollenMapping objects found for the organizations within your editing rights',
                );
            });

            it('should throw NotFoundException if no rollenMapping found', async () => {
                permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.find.mockResolvedValue([]);

                await expect(rollenMappingController.getAllAvailableRollenMapping(permissionsMock)).rejects.toThrow(
                    'No rollenMapping objects found',
                );
            });
        });
    });

    describe('createNewRollenMapping', () => {
        describe('when called', () => {
            it('should create and return rollenMapping if permission is granted', async () => {
                const rollenMappingCreateBodyParams: RollenMappingCreateBodyParams = {
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: 'user',
                };
                const rollingMappingExpected: RollenMapping<true> = {
                    id: faker.string.uuid(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    rolleId: rollenMappingCreateBodyParams.rolleId,
                    serviceProviderId: rollenMappingCreateBodyParams.serviceProviderId,
                    mapToLmsRolle: rollenMappingCreateBodyParams.mapToLmsRolle,
                };
                permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(true);
                rollenMappingFactoryMock.createNew.mockReturnValue(
                    rollingMappingExpected as unknown as RollenMapping<false>,
                );
                rollenMappingRepoMock.create.mockResolvedValue(rollingMappingExpected);

                await rollenMappingController.createNewRollenMapping(rollenMappingCreateBodyParams, permissionsMock);

                expect(rollenMappingRepoMock.create).toHaveBeenCalled();
            });

            it('should throw ForbiddenException if permission is missing', async () => {
                const rollenMappingCreateBodyParams: RollenMappingCreateBodyParams = {
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: 'User',
                };
                permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(false);

                await expect(
                    rollenMappingController.createNewRollenMapping(rollenMappingCreateBodyParams, permissionsMock),
                ).rejects.toThrow('Insufficient rights to create the rollenMapping objects into this organization');
            });
        });
    });

    describe('updateExistingRollenMapping', () => {
        describe('when called', () => {
            it('should update and return rollenMapping if permission and entity exist', async () => {
                const id: string = faker.string.uuid();
                const mapToLmsRolle: string = 'Teacher';
                const rollenMappingToBeUpdated: RollenMapping<true> = {
                    id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: 'User',
                };
                const rollenMappingUpdateExpectedResult: RollenMapping<true> = {
                    id,
                    createdAt: rollenMappingToBeUpdated.createdAt,
                    updatedAt: new Date(),
                    rolleId: rollenMappingToBeUpdated.rolleId,
                    serviceProviderId: rollenMappingToBeUpdated.serviceProviderId,
                    mapToLmsRolle: mapToLmsRolle,
                };
                permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.findById.mockResolvedValue(rollenMappingToBeUpdated);
                rollenMappingFactoryMock.update.mockReturnValue(rollenMappingUpdateExpectedResult);
                rollenMappingRepoMock.save.mockResolvedValue(rollenMappingUpdateExpectedResult);

                const result: RollenMapping<true> = await rollenMappingController.updateExistingRollenMapping(
                    id,
                    mapToLmsRolle,
                    permissionsMock,
                );

                expect(result).toStrictEqual(rollenMappingUpdateExpectedResult);
                expect(rollenMappingFactoryMock.update).toHaveBeenCalledWith(
                    rollenMappingToBeUpdated.id,
                    rollenMappingToBeUpdated.createdAt,
                    expect.any(Date),
                    rollenMappingToBeUpdated.rolleId,
                    rollenMappingToBeUpdated.serviceProviderId,
                    mapToLmsRolle,
                );
                expect(rollenMappingRepoMock.save).toHaveBeenCalledWith(rollenMappingUpdateExpectedResult);
            });

            it('should throw ForbiddenException if permission is missing', async () => {
                const id: string = faker.string.uuid();
                const rollenMappingUpdate: RollenMapping<true> = {
                    id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: 'User',
                };
                permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(false);
                rollenMappingRepoMock.findById.mockResolvedValue(rollenMappingUpdate);

                await expect(
                    rollenMappingController.updateExistingRollenMapping(
                        id,
                        rollenMappingUpdate.mapToLmsRolle,
                        permissionsMock,
                    ),
                ).rejects.toThrow('Insufficient rights to update the rollenMapping objects in this organization');
            });

            it('should throw NotFoundException if rollenMapping does not exist', async () => {
                const id: string = faker.string.uuid();
                const rollenMappingUpdate: RollenMapping<true> = {
                    id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: 'User',
                };
                permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.findById.mockResolvedValue(undefined);

                await expect(
                    rollenMappingController.updateExistingRollenMapping(
                        id,
                        rollenMappingUpdate.mapToLmsRolle,
                        permissionsMock,
                    ),
                ).rejects.toThrow(`No rollenMapping found with id ${id}`);
            });
        });
    });

    describe('deleteExistingRollenMapping', () => {
        describe('when called', () => {
            it('should delete rollenMapping if permission and entity exist', async () => {
                const id: string = faker.string.uuid();
                permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.findById.mockResolvedValue({
                    id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: 'User',
                });
                rollenMappingRepoMock.delete.mockResolvedValue(undefined);

                await expect(
                    rollenMappingController.deleteExistingRollenMapping(id, permissionsMock),
                ).resolves.toBeUndefined();
                expect(rollenMappingRepoMock.delete).toHaveBeenCalledWith(id);
            });

            it('should throw ForbiddenException if permission is missing', async () => {
                const id: string = faker.string.uuid();
                permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(false);
                rollenMappingRepoMock.findById.mockResolvedValue({
                    id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: 'User',
                });

                await expect(rollenMappingController.deleteExistingRollenMapping(id, permissionsMock)).rejects.toThrow(
                    'Insufficient rights to delete the rollenMapping',
                );
            });

            it('should throw NotFoundException if rollenMapping does not exist', async () => {
                const id: string = faker.string.uuid();
                permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.findById.mockResolvedValue(undefined);

                await expect(rollenMappingController.deleteExistingRollenMapping(id, permissionsMock)).rejects.toThrow(
                    `No rollenMapping found with id ${id}`,
                );
            });
        });
        describe('getAvailableRollenMappingForServiceProvider', () => {
            describe('When Called', () => {
                const serviceProviderId: string = faker.string.uuid();

                it('should return rollenMapping array if permission is granted and entities exist', async () => {
                    const rollenMappings: RollenMapping<true>[] = [
                        {
                            id: faker.string.uuid(),
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            rolleId: faker.string.uuid(),
                            serviceProviderId,
                            mapToLmsRolle: faker.string.uuid(),
                        },
                    ];
                    const serviceProvider: ServiceProvider<true> = DoFactory.createServiceProvider<true>(true, {
                        id: serviceProviderId,
                    });
                    serviceProviderRepoMock.findById.mockResolvedValue(Promise.resolve(serviceProvider));
                    permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(true);
                    rollenMappingRepoMock.findByServiceProviderId.mockResolvedValue(rollenMappings);

                    const result: RollenMapping<true>[] =
                        await rollenMappingController.getAvailableRollenMappingForServiceProvider(
                            serviceProviderId,
                            permissionsMock,
                        );
                    expect(result).toBe(rollenMappings);
                });

                it('should throw ForbiddenException if permission is missing', async () => {
                    const serviceProvider: ServiceProvider<true> = DoFactory.createServiceProvider<true>(true, {
                        id: serviceProviderId,
                    });
                    serviceProviderRepoMock.findById.mockResolvedValue(serviceProvider);
                    permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(false);

                    await expect(
                        rollenMappingController.getAvailableRollenMappingForServiceProvider(
                            serviceProviderId,
                            permissionsMock,
                        ),
                    ).rejects.toThrow(
                        'Insufficient rights to retrieve the rollenMapping objects from this organization',
                    );
                });

                it('should throw NotFoundException if no rollenMapping found for service provider', async () => {
                    const serviceProvider: ServiceProvider<true> = DoFactory.createServiceProvider<true>(true, {
                        id: serviceProviderId,
                    });
                    serviceProviderRepoMock.findById.mockResolvedValue(serviceProvider);
                    permissionsMock.hasSystemrechtAtOrganisation.mockResolvedValue(true);
                    rollenMappingRepoMock.findByServiceProviderId.mockResolvedValue([]);

                    await expect(
                        rollenMappingController.getAvailableRollenMappingForServiceProvider(
                            serviceProviderId,
                            permissionsMock,
                        ),
                    ).rejects.toThrow(`No rollenMapping objects found for service provider id ${serviceProviderId}`);
                });
            });
        });
    });
});
