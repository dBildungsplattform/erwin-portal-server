import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
    ConfigTestModule,
    DatabaseTestModule,
    KeycloakConfigTestModule,
    LoggingTestModule,
    MapperTestModule,
} from '../../../test/utils/index.js';
import { DbSeedService } from './domain/db-seed.service.js';
import { DbSeedConsole } from './db-seed.console.js';
import { UsernameGeneratorService } from '../../modules/person/domain/username-generator.service.js';
import { KeycloakAdministrationModule } from '../../modules/keycloak-administration/keycloak-administration.module.js';
import { KeycloakConfigModule } from '../../modules/keycloak-administration/keycloak-config.module.js';
import { OrganisationModule } from '../../modules/organisation/organisation.module.js';
import { DBiamPersonenkontextRepo } from '../../modules/personenkontext/persistence/dbiam-personenkontext.repo.js';
import { PersonModule } from '../../modules/person/person.module.js';
import { RolleModule } from '../../modules/rolle/rolle.module.js';
import { ServiceProviderModule } from '../../modules/service-provider/service-provider.module.js';
import { DbSeedRepo } from './repo/db-seed.repo.js';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { DbSeed } from './domain/db-seed.js';
import { DbSeedStatus } from './repo/db-seed.entity.js';
import { DBiamPersonenkontextService } from '../../modules/personenkontext/domain/dbiam-personenkontext.service.js';
import { DbSeedReferenceRepo } from './repo/db-seed-reference.repo.js';
import { PersonenKontextModule } from '../../modules/personenkontext/personenkontext.module.js';
import { LdapClient } from '../../core/ldap/domain/ldap-client.js';
import { OxUserBlacklistRepo } from '../../modules/person/persistence/ox-user-blacklist.repo.js';
import { EntityAggregateMapper } from '../../modules/person/mapper/entity-aggregate.mapper.js';

describe('DbSeedConsoleMockedDbSeedRepo', () => {
    let module: TestingModule;
    let sut: DbSeedConsole;
    let orm: MikroORM;
    let dbSeedService: DbSeedService;
    let dbSeedRepoMock: DeepMocked<DbSeedRepo>;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                ConfigTestModule,
                OrganisationModule,
                KeycloakAdministrationModule,
                MapperTestModule,
                DatabaseTestModule.forRoot({ isDatabaseRequired: true }),
                LoggingTestModule,
                PersonModule,
                RolleModule,
                ServiceProviderModule,
                PersonenKontextModule,
            ],
            providers: [
                UsernameGeneratorService,
                DBiamPersonenkontextRepo,
                OxUserBlacklistRepo,
                DbSeedConsole,
                DbSeedService,
                DBiamPersonenkontextService,
                DbSeedReferenceRepo,
                {
                    provide: DbSeedRepo,
                    useValue: createMock<DbSeedRepo>(),
                },
                {
                    provide: LdapClient,
                    useValue: createMock<LdapClient>(),
                },
                EntityAggregateMapper,
            ],
        })
            .overrideModule(KeycloakConfigModule)
            .useModule(KeycloakConfigTestModule.forRoot({ isKeycloakRequired: true }))
            .compile();
        sut = module.get(DbSeedConsole);
        orm = module.get(MikroORM);
        dbSeedRepoMock = module.get(DbSeedRepo);
        dbSeedService = module.get(DbSeedService);

        await DatabaseTestModule.setupDatabase(module.get(MikroORM));
    }, 10000000);

    beforeEach(async () => {
        await DatabaseTestModule.clearDatabase(orm);
    });

    afterAll(async () => {
        await orm.close();
        await module.close();
    });

    it('should be defined', () => {
        expect(sut).toBeDefined();
    });

    it('should be defined', () => {
        expect(dbSeedService).toBeDefined();
        expect(orm).toBeDefined();
    });

    describe('resolveEnvVariables', () => {
        // Access private method for testing
        const callResolveEnvVariables = (instance: DbSeedConsole, content: string): string =>
            (instance as unknown as { resolveEnvVariables: (c: string) => string }).resolveEnvVariables(content);

        it('should replace env variable placeholders with values', () => {
            process.env['TEST_SEED_VAR'] = 'resolved-value';
            const result: string = callResolveEnvVariables(sut, 'Hello ${TEST_SEED_VAR}!');
            expect(result).toBe('Hello resolved-value!');
            delete process.env['TEST_SEED_VAR'];
        });

        it('should return empty string and log warning for undefined env variables', () => {
            delete process.env['UNDEFINED_SEED_VAR'];
            const result: string = callResolveEnvVariables(sut, 'Hello ${UNDEFINED_SEED_VAR}!');
            expect(result).toBe('Hello !');
        });
    });

    describe('run', () => {
        describe('skips files if previous seeding was successful', () => {
            it('should skip without processing', async () => {
                const params: string[] = ['seeding-integration-test/all'];

                const dbSeedMock: DbSeed<true> = createMock<DbSeed<true>>({ status: DbSeedStatus.DONE });
                dbSeedRepoMock.findById.mockResolvedValue(dbSeedMock);

                await expect(sut.run(params)).resolves.not.toThrow();
            });
        });

        describe('retries files if previous seeding failed', () => {
            it('should delete failed record, retry processing and log unknown reason when failureReason is not set', async () => {
                const params: string[] = ['seeding-integration-test/all'];

                const dbSeedMock: DbSeed<true> = createMock<DbSeed<true>>({ status: DbSeedStatus.FAILED });
                dbSeedRepoMock.findById.mockResolvedValue(dbSeedMock);

                const persistedDbSeed: DbSeed<true> = createMock<DbSeed<true>>({ status: DbSeedStatus.STARTED });
                dbSeedRepoMock.create.mockResolvedValue(persistedDbSeed);

                jest.spyOn(dbSeedService, 'readDataProvider').mockReturnValue([]);
                jest.spyOn(dbSeedService, 'seedOrganisation').mockResolvedValue();
                jest.spyOn(dbSeedService, 'seedPerson').mockResolvedValue();
                jest.spyOn(dbSeedService, 'seedRolle').mockResolvedValue();
                jest.spyOn(dbSeedService, 'seedServiceProvider').mockResolvedValue();
                jest.spyOn(dbSeedService, 'seedPersonenkontext').mockResolvedValue([]);
                jest.spyOn(dbSeedService, 'seedTechnicalUser').mockResolvedValue();

                await expect(sut.run(params)).resolves.not.toThrow();
                expect(dbSeedRepoMock.deleteById).toHaveBeenCalled();
                expect(dbSeedRepoMock.create).toHaveBeenCalled();
            });

            it('should delete failed record, retry processing and log stored failureReason', async () => {
                const params: string[] = ['seeding-integration-test/all'];

                const dbSeedMock: DbSeed<true> = createMock<DbSeed<true>>({
                    status: DbSeedStatus.FAILED,
                    failureReason: 'Error: previous failure details',
                });
                dbSeedRepoMock.findById.mockResolvedValue(dbSeedMock);

                const persistedDbSeed: DbSeed<true> = createMock<DbSeed<true>>({ status: DbSeedStatus.STARTED });
                dbSeedRepoMock.create.mockResolvedValue(persistedDbSeed);

                jest.spyOn(dbSeedService, 'readDataProvider').mockReturnValue([]);
                jest.spyOn(dbSeedService, 'seedOrganisation').mockResolvedValue();
                jest.spyOn(dbSeedService, 'seedPerson').mockResolvedValue();
                jest.spyOn(dbSeedService, 'seedRolle').mockResolvedValue();
                jest.spyOn(dbSeedService, 'seedServiceProvider').mockResolvedValue();
                jest.spyOn(dbSeedService, 'seedPersonenkontext').mockResolvedValue([]);
                jest.spyOn(dbSeedService, 'seedTechnicalUser').mockResolvedValue();

                await expect(sut.run(params)).resolves.not.toThrow();
                expect(dbSeedRepoMock.deleteById).toHaveBeenCalled();
                expect(dbSeedRepoMock.create).toHaveBeenCalled();
            });
        });

        describe('creates new seed entry when no previous hash exists', () => {
            it('should process files and mark as done', async () => {
                const params: string[] = ['seeding-integration-test/all'];

                const persistedDbSeed: DbSeed<true> = createMock<DbSeed<true>>({ status: DbSeedStatus.STARTED });
                dbSeedRepoMock.findById.mockResolvedValue(null);
                dbSeedRepoMock.create.mockResolvedValue(persistedDbSeed);

                jest.spyOn(dbSeedService, 'readDataProvider').mockReturnValue([]);
                jest.spyOn(dbSeedService, 'seedOrganisation').mockResolvedValue();
                jest.spyOn(dbSeedService, 'seedPerson').mockResolvedValue();
                jest.spyOn(dbSeedService, 'seedRolle').mockResolvedValue();
                jest.spyOn(dbSeedService, 'seedServiceProvider').mockResolvedValue();
                jest.spyOn(dbSeedService, 'seedPersonenkontext').mockResolvedValue([]);
                jest.spyOn(dbSeedService, 'seedTechnicalUser').mockResolvedValue();

                await expect(sut.run(params)).resolves.not.toThrow();
                expect(dbSeedRepoMock.create).toHaveBeenCalled();
                expect(persistedDbSeed.setDone).toHaveBeenCalled();
                expect(dbSeedRepoMock.update).toHaveBeenCalled();
            });
        });

        describe('creates new seed entry and processing fails', () => {
            it('should throw and mark as failed with Error stack trace', async () => {
                const params: string[] = ['seeding-integration-test/all'];

                const persistedDbSeed: DbSeed<true> = createMock<DbSeed<true>>({ status: DbSeedStatus.STARTED });
                dbSeedRepoMock.findById.mockResolvedValue(null);
                dbSeedRepoMock.create.mockResolvedValue(persistedDbSeed);

                jest.spyOn(dbSeedService, 'readDataProvider').mockImplementation(() => {
                    throw new Error('Processing failed');
                });

                await expect(sut.run(params)).rejects.toThrow('Processing failed');
                expect(persistedDbSeed.setFailed).toHaveBeenCalledWith(expect.stringContaining('Processing failed'));
            });

            it('should throw and mark as failed with stringified reason for non-Error throws', async () => {
                const params: string[] = ['seeding-integration-test/all'];

                const persistedDbSeed: DbSeed<true> = createMock<DbSeed<true>>({ status: DbSeedStatus.STARTED });
                dbSeedRepoMock.findById.mockResolvedValue(null);
                dbSeedRepoMock.create.mockResolvedValue(persistedDbSeed);

                const errorWithoutStack: Error = new Error('non-error failure');
                delete errorWithoutStack.stack;
                jest.spyOn(dbSeedService, 'readDataProvider').mockImplementation((): never => {
                    throw errorWithoutStack;
                });

                await expect(sut.run(params)).rejects.toThrow('non-error failure');
                expect(persistedDbSeed.setFailed).toHaveBeenCalledWith('non-error failure');
            });
        });
    });
});
