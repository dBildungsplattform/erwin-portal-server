import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { APP_PIPE } from '@nestjs/core';
import { TestingModule, Test } from '@nestjs/testing';
import { RollenMappingRepo } from '../repo/rollenmapping.repo.js';
import { RollenMappingFactory } from '../domain/rollenmapping.factory.js';
import { RollenmappingController } from './rollenmapping.controller.js';
import { PersonPermissions } from '../../authentication/domain/person-permissions.js';
import { faker } from '@faker-js/faker';
import { RollenMapping } from '../domain/rollenmapping.js';
import { GlobalValidationPipe } from '../../../shared/validation/global-validation.pipe.js';
import { LoggingTestModule } from '../../../../test/utils/logging-test.module.js';
import { MapperTestModule } from '../../../../test/utils/mapper-test.module.js';
import { DEFAULT_TIMEOUT_FOR_TESTCONTAINERS } from '../../../../test/utils/timeouts.js';
import { RollenmappingCreateBodyParams } from './rollenmapping-create-body.params.js';

describe('Rollenmapping API', () => {
    let rollenMappingRepoMock: DeepMocked<RollenMappingRepo>;
    let rollenMappingController: RollenmappingController;
    let rollenMappingFactoryMock: DeepMocked<RollenMappingFactory>;
    let permissionsMock: DeepMocked<PersonPermissions>;

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
                RollenmappingController,
            ],
        }).compile();

        rollenMappingRepoMock = module.get(RollenMappingRepo);
        rollenMappingFactoryMock = module.get(RollenMappingFactory);
        rollenMappingController = module.get(RollenmappingController);
        permissionsMock = module.get(PersonPermissions);
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
        permissionsMock.hasSystemrechteAtRootOrganisation.mockReset();
    });

    describe('getRollenmappingWithId', () => {
        describe('when called', () => {
            it('should return rollenmapping if permission and entity exist', async () => {
                const rollenMapping: RollenMapping<true> = {
                    id: faker.string.uuid(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: faker.string.uuid(),
                };
                permissionsMock.hasSystemrechteAtRootOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.findById.mockResolvedValue(rollenMapping);

                const result: RollenMapping<true> = await rollenMappingController.getRollenmappingWithId(
                    rollenMapping.id,
                    permissionsMock,
                );
                expect(result).toBe(rollenMapping);
            });

            it('should throw ForbiddenException if permission is missing', async () => {
                const id: string = faker.string.uuid();
                permissionsMock.hasSystemrechteAtRootOrganisation.mockResolvedValue(false);

                await expect(rollenMappingController.getRollenmappingWithId(id, permissionsMock)).rejects.toThrow(
                    'Insufficient rights to retrieve the rollenmapping objects',
                );
            });

            it('should throw NotFoundException if rollenmapping does not exist', async () => {
                const id: string = faker.string.uuid();
                permissionsMock.hasSystemrechteAtRootOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.findById.mockResolvedValue(undefined);

                await expect(rollenMappingController.getRollenmappingWithId(id, permissionsMock)).rejects.toThrow(
                    `No rollenmapping object found with id ${id}`,
                );
            });
        });
    });

    describe('getAllAvailableRollenmapping', () => {
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
                permissionsMock.hasSystemrechteAtRootOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.find.mockResolvedValue(rollenMappings);

                const result: RollenMapping<true>[] =
                    await rollenMappingController.getAllAvailableRollenmapping(permissionsMock);
                expect(result).toBe(rollenMappings);
            });

            it('should throw ForbiddenException if permission is missing', async () => {
                permissionsMock.hasSystemrechteAtRootOrganisation.mockResolvedValue(false);

                await expect(rollenMappingController.getAllAvailableRollenmapping(permissionsMock)).rejects.toThrow(
                    'Insufficient rights to retrieve the rollenmapping objects',
                );
            });

            it('should throw NotFoundException if no rollenmapping found', async () => {
                permissionsMock.hasSystemrechteAtRootOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.find.mockResolvedValue([]);

                await expect(rollenMappingController.getAllAvailableRollenmapping(permissionsMock)).rejects.toThrow(
                    'No rollenmapping objects found',
                );
            });
        });
    });

    describe('createNewRollenmapping', () => {
        describe('when called', () => {
            it('should create and return rollenmapping if permission is granted', async () => {
                const rollenMappingCreateBodyParams: RollenmappingCreateBodyParams = {
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: 'Moodle',
                };
                const rollenMapping: RollenMapping<true> = {
                    id: faker.string.uuid(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: faker.string.uuid(),
                };
                const rollenMappingDomain: RollenMapping<false> = {
                    id: faker.string.uuid(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: faker.string.uuid(),
                };
                permissionsMock.hasSystemrechteAtRootOrganisation.mockResolvedValue(true);
                rollenMappingFactoryMock.createNew.mockReturnValue(rollenMappingDomain);
                rollenMappingRepoMock.save.mockResolvedValue(rollenMapping);

                const result: RollenMapping<true> = await rollenMappingController.createNewRollenmapping(
                    rollenMappingCreateBodyParams,
                    permissionsMock,
                );
                expect(result).toBe(rollenMapping);
                expect(rollenMappingFactoryMock.createNew).toHaveBeenCalledWith(
                    rollenMappingCreateBodyParams.rolleId,
                    rollenMappingCreateBodyParams.serviceProviderId,
                    rollenMappingCreateBodyParams.mapToLmsRolle,
                );
                expect(rollenMappingRepoMock.save).toHaveBeenCalledWith(rollenMappingDomain);
            });

            it('should throw ForbiddenException if permission is missing', async () => {
                const rollenMappingCreateBodyParams: RollenmappingCreateBodyParams = {
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: 'Moodle',
                };
                permissionsMock.hasSystemrechteAtRootOrganisation.mockResolvedValue(false);

                await expect(
                    rollenMappingController.createNewRollenmapping(rollenMappingCreateBodyParams, permissionsMock),
                ).rejects.toThrow('Insufficient rights to create rollenmapping object');
            });
        });
    });

    describe('updateExistingRollenmapping', () => {
        describe('when called', () => {
            it('should update and return rollenmapping if permission and entity exist', async () => {
                const id: string = faker.string.uuid();
                const serviceProviderId: string = faker.string.uuid();
                const rollenMappingToBeUpdated: RollenMapping<true> = {
                    id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    rolleId: faker.string.uuid(),
                    serviceProviderId,
                    mapToLmsRolle: 'Moodle',
                };
                const rollenMappingUpdateExpectedResult: RollenMapping<true> = {
                    id,
                    createdAt: rollenMappingToBeUpdated.createdAt,
                    updatedAt: new Date(),
                    rolleId: rollenMappingToBeUpdated.rolleId,
                    serviceProviderId,
                    mapToLmsRolle: 'Moodle',
                };
                permissionsMock.hasSystemrechteAtRootOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.findById.mockResolvedValue(rollenMappingToBeUpdated);
                rollenMappingFactoryMock.update.mockReturnValue(rollenMappingUpdateExpectedResult);
                rollenMappingRepoMock.save.mockResolvedValue(rollenMappingToBeUpdated);

                const result: RollenMapping<true> = await rollenMappingController.updateExistingRollenmapping(
                    id,
                    rollenMappingToBeUpdated,
                    permissionsMock,
                );

                expect(result).toStrictEqual(rollenMappingUpdateExpectedResult);
                expect(rollenMappingFactoryMock.update).toHaveBeenCalledWith(
                    rollenMappingToBeUpdated.id,
                    rollenMappingToBeUpdated.createdAt,
                    expect.any(Date),
                    rollenMappingToBeUpdated.rolleId,
                    rollenMappingToBeUpdated.serviceProviderId,
                    rollenMappingToBeUpdated.mapToLmsRolle,
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
                    mapToLmsRolle: 'Moodle',
                };
                permissionsMock.hasSystemrechteAtRootOrganisation.mockResolvedValue(false);

                await expect(
                    rollenMappingController.updateExistingRollenmapping(id, rollenMappingUpdate, permissionsMock),
                ).rejects.toThrow('Insufficient rights to create rollenmapping object');
            });

            it('should throw NotFoundException if rollenmapping does not exist', async () => {
                const id: string = faker.string.uuid();
                const rollenMappingUpdate: RollenMapping<true> = {
                    id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: 'Moodle',
                };
                permissionsMock.hasSystemrechteAtRootOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.findById.mockResolvedValue(undefined);

                await expect(
                    rollenMappingController.updateExistingRollenmapping(id, rollenMappingUpdate, permissionsMock),
                ).rejects.toThrow(`No rollenmapping found with id ${id}`);
            });
        });
    });

    describe('deleteExistingRollenmapping', () => {
        describe('when called', () => {
            it('should delete rollenmapping if permission and entity exist', async () => {
                const id: string = faker.string.uuid();
                permissionsMock.hasSystemrechteAtRootOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.findById.mockResolvedValue({
                    id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    rolleId: faker.string.uuid(),
                    serviceProviderId: faker.string.uuid(),
                    mapToLmsRolle: 'Moodle',
                });
                rollenMappingRepoMock.delete.mockResolvedValue(undefined);

                await expect(
                    rollenMappingController.deleteExistingRollenmapping(id, permissionsMock),
                ).resolves.toBeUndefined();
                expect(rollenMappingRepoMock.delete).toHaveBeenCalledWith(id);
            });

            it('should throw ForbiddenException if permission is missing', async () => {
                const id: string = faker.string.uuid();
                permissionsMock.hasSystemrechteAtRootOrganisation.mockResolvedValue(false);

                await expect(rollenMappingController.deleteExistingRollenmapping(id, permissionsMock)).rejects.toThrow(
                    'Insufficient rights to create rollenmapping object',
                );
            });

            it('should throw NotFoundException if rollenmapping does not exist', async () => {
                const id: string = faker.string.uuid();
                permissionsMock.hasSystemrechteAtRootOrganisation.mockResolvedValue(true);
                rollenMappingRepoMock.findById.mockResolvedValue(undefined);

                await expect(rollenMappingController.deleteExistingRollenmapping(id, permissionsMock)).rejects.toThrow(
                    `No rollenmapping found with id ${id}`,
                );
            });
        });
    });
});
