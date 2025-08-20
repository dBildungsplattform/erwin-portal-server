import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ForbiddenException, HttpException, INestApplication } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Client } from 'openid-client';
import { ConfigTestModule } from '../../../../test/utils/config-test.module.js';
import { DatabaseTestModule } from '../../../../test/utils/database-test.module.js';
import { DoFactory } from '../../../../test/utils/do-factory.js';
import { MapperTestModule } from '../../../../test/utils/mapper-test.module.js';
import { DEFAULT_TIMEOUT_FOR_TESTCONTAINERS } from '../../../../test/utils/timeouts.js';
import { GlobalValidationPipe } from '../../../shared/validation/global-validation.pipe.js';
import { PersonPermissions } from '../../authentication/domain/person-permissions.js';
import { OIDC_CLIENT } from '../../authentication/services/oidc-client.service.js';
import { ServiceProvider } from '../domain/service-provider.js';
import { ServiceProviderService } from '../domain/service-provider.service.js';
import { ServiceProviderRepo } from '../repo/service-provider.repo.js';
import { ServiceProviderApiModule } from '../service-provider-api.module.js';
import { ProviderController } from './provider.controller.js';
import { ServiceProviderResponse } from './service-provider.response.js';
import { ServiceProviderBodyParams } from './service-provider.body.params.js';
import { RollenSystemRecht } from '../../rolle/domain/rolle.enums.js';
import { SchulConnexError } from '../../../shared/error/schul-connex.error.js';

describe('Provider Controller Test', () => {
    let app: INestApplication;
    let serviceProviderServiceMock: DeepMocked<ServiceProviderService>;
    let serviceProviderRepoMock: DeepMocked<ServiceProviderRepo>;
    let providerController: ProviderController;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                MapperTestModule,
                ServiceProviderApiModule,
                ConfigTestModule,
                DatabaseTestModule.forRoot({ isDatabaseRequired: false }),
            ],
            providers: [
                {
                    provide: APP_PIPE,
                    useClass: GlobalValidationPipe,
                },
                {
                    provide: OIDC_CLIENT,
                    useValue: createMock<Client>(),
                },
            ],
        })
            .overrideProvider(ServiceProviderService)
            .useValue(createMock<ServiceProviderService>())
            .overrideProvider(ServiceProviderRepo)
            .useValue(createMock<ServiceProviderRepo>())
            .compile();

        serviceProviderServiceMock = module.get<DeepMocked<ServiceProviderService>>(ServiceProviderService);
        serviceProviderRepoMock = module.get<DeepMocked<ServiceProviderRepo>>(ServiceProviderRepo);
        providerController = module.get(ProviderController);
        app = module.createNestApplication();
        await app.init();
    }, DEFAULT_TIMEOUT_FOR_TESTCONTAINERS);

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('getAllServiceProviders', () => {
        describe('when service providers were found', () => {
            it('should return all service provider', async () => {
                const spId: string = faker.string.uuid();
                const sp: ServiceProvider<true> = DoFactory.createServiceProvider(true, { id: spId });

                serviceProviderRepoMock.find.mockResolvedValueOnce([sp]);

                const spResponse: ServiceProviderResponse[] = await providerController.getAllServiceProviders();
                expect(spResponse).toBeDefined();
                expect(spResponse).toBeInstanceOf(Array);
                expect(spResponse).toHaveLength(1);
            });
        });

        describe('when no service providers were found', () => {
            it('should return empty list as response', async () => {
                serviceProviderRepoMock.find.mockResolvedValueOnce([]);

                const spResponse: ServiceProviderResponse[] = await providerController.getAllServiceProviders();
                expect(spResponse).toBeDefined();
                expect(spResponse).toBeInstanceOf(Array);
                expect(spResponse).toHaveLength(0);
            });
        });
    });

    describe('getAvailableServiceProviders', () => {
        describe('when service providers were found', () => {
            it('should return all service provider', async () => {
                const rolleId: string = faker.string.uuid();
                const spId: string = faker.string.uuid();

                const sp: ServiceProvider<true> = DoFactory.createServiceProvider(true, { id: spId });
                const personPermissions: DeepMocked<PersonPermissions> = createMock<PersonPermissions>({});
                personPermissions.getRoleIds.mockResolvedValueOnce([rolleId]);

                serviceProviderServiceMock.getServiceProvidersByRolleIds.mockResolvedValueOnce([sp]);

                const spResponse: ServiceProviderResponse[] =
                    await providerController.getAvailableServiceProviders(personPermissions);
                expect(spResponse).toBeDefined();
                expect(spResponse).toBeInstanceOf(Array);
                expect(spResponse).toHaveLength(1);
            });
        });

        describe('when no service providers were found', () => {
            it('should return empty list as response', async () => {
                const rolleId: string = faker.string.uuid();

                const personPermissions: DeepMocked<PersonPermissions> = createMock<PersonPermissions>({});
                personPermissions.getRoleIds.mockResolvedValueOnce([rolleId]);

                serviceProviderServiceMock.getServiceProvidersByRolleIds.mockResolvedValueOnce([]);

                const spResponse: ServiceProviderResponse[] =
                    await providerController.getAvailableServiceProviders(personPermissions);
                expect(spResponse).toBeDefined();
                expect(spResponse).toBeInstanceOf(Array);
                expect(spResponse).toHaveLength(0);
            });
        });
    });

    describe('createNewServiceProvider', () => {
        describe('when user has the RollenSystemRecht SERVICEPROVIDER_VERWALTEN', () => {
            it('should return all service provider', async () => {
                const spId: string = faker.string.uuid();
                const sp: ServiceProvider<true> = DoFactory.createServiceProvider(true, { id: spId });
                serviceProviderRepoMock.save.mockResolvedValueOnce(sp);

                const personPermissions: DeepMocked<PersonPermissions> = createMock<PersonPermissions>({});
                personPermissions.hasSystemrechteAtRootOrganisation.mockResolvedValueOnce(true);

                const spBodyParams: ServiceProviderBodyParams = {
                    name: sp.name,
                    target: sp.target,
                    url: sp.url ?? '',
                    kategorie: sp.kategorie,
                    providedOnSchulstrukturknoten: sp.providedOnSchulstrukturknoten,
                    externalSystem: sp.externalSystem,
                    requires2fa: sp.requires2fa,
                };

                const spResponse: ServiceProviderResponse = await providerController.createNewServiceProvider(
                    spBodyParams,
                    personPermissions,
                );

                expect(spResponse).toBeDefined();
                expect(spResponse).toBeInstanceOf(ServiceProviderResponse);
                expect(serviceProviderRepoMock.save).toHaveBeenCalledWith(expect.objectContaining(spBodyParams));
                expect(personPermissions.hasSystemrechteAtRootOrganisation).toHaveBeenCalledWith([
                    RollenSystemRecht.SERVICEPROVIDER_VERWALTEN,
                ]);
            });
        });

        describe('when user does not have the RollenSystemRecht SERVICEPROVIDER_VERWALTEN', () => {
            it('should throw ForbiddenException', async () => {
                const personPermissions: DeepMocked<PersonPermissions> = createMock<PersonPermissions>({});
                personPermissions.hasSystemrechteAtRootOrganisation.mockResolvedValueOnce(false);

                const spBodyParams: ServiceProviderBodyParams = {} as ServiceProviderBodyParams;

                await expect(
                    providerController.createNewServiceProvider(spBodyParams, personPermissions),
                ).rejects.toThrow(ForbiddenException);
                expect(serviceProviderRepoMock.save).not.toHaveBeenCalled();
                expect(personPermissions.hasSystemrechteAtRootOrganisation).toHaveBeenCalledWith([
                    RollenSystemRecht.SERVICEPROVIDER_VERWALTEN,
                ]);
            });
        });
    });

    describe('deleteServiceProvider', () => {
        describe('when user has the RollenSystemRecht SERVICEPROVIDER_VERWALTEN and service provider exists', () => {
            it('should not throw', async () => {
                const spId: string = faker.string.uuid();
                serviceProviderRepoMock.deleteById.mockResolvedValueOnce(true);

                const personPermissions: DeepMocked<PersonPermissions> = createMock<PersonPermissions>({});
                personPermissions.hasSystemrechteAtRootOrganisation.mockResolvedValueOnce(true);

                await expect(
                    providerController.deleteServiceProvider({ angebotId: spId }, personPermissions),
                ).resolves.not.toThrow();

                expect(serviceProviderRepoMock.deleteById).toHaveBeenCalledWith(spId);
                expect(personPermissions.hasSystemrechteAtRootOrganisation).toHaveBeenCalledWith([
                    RollenSystemRecht.SERVICEPROVIDER_VERWALTEN,
                ]);
            });
        });

        describe('when user does not have the RollenSystemRecht SERVICEPROVIDER_VERWALTEN', () => {
            it('should throw ForbiddenException', async () => {
                const personPermissions: DeepMocked<PersonPermissions> = createMock<PersonPermissions>({});
                personPermissions.hasSystemrechteAtRootOrganisation.mockResolvedValueOnce(false);

                await expect(() =>
                    providerController.deleteServiceProvider({ angebotId: faker.string.uuid() }, personPermissions),
                ).rejects.toThrow(ForbiddenException);

                expect(serviceProviderRepoMock.deleteById).not.toHaveBeenCalled();
                expect(personPermissions.hasSystemrechteAtRootOrganisation).toHaveBeenCalledWith([
                    RollenSystemRecht.SERVICEPROVIDER_VERWALTEN,
                ]);
            });
        });

        describe('when user has the RollenSystemRecht SERVICEPROVIDER_VERWALTEN but the service provider does not exist', () => {
            it('should throw SchulConnexError', async () => {
                const spId: string = faker.string.uuid();
                serviceProviderRepoMock.deleteById.mockResolvedValueOnce(false);

                const personPermissions: DeepMocked<PersonPermissions> = createMock<PersonPermissions>({});
                personPermissions.hasSystemrechteAtRootOrganisation.mockResolvedValueOnce(true);

                await expect(() =>
                    providerController.deleteServiceProvider({ angebotId: spId }, personPermissions),
                ).rejects.toThrow(
                    new HttpException(
                        new SchulConnexError({
                            code: 404,
                            subcode: '01',
                            titel: 'Angefragte Entität existiert nicht',
                            beschreibung: 'Die angeforderte Entität existiert nicht',
                        }),
                        404,
                    ),
                );

                expect(serviceProviderRepoMock.deleteById).toHaveBeenCalledWith(spId);
                expect(personPermissions.hasSystemrechteAtRootOrganisation).toHaveBeenCalledWith([
                    RollenSystemRecht.SERVICEPROVIDER_VERWALTEN,
                ]);
            });
        });
    });
});
