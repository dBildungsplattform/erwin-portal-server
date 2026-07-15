import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
    ConfigTestModule,
    DatabaseTestModule,
    KeycloakConfigTestModule,
    LoggingTestModule,
    MapperTestModule,
} from '../../../../test/utils/index.js';
import { KeycloakAdministrationModule } from '../../../modules/keycloak-administration/keycloak-administration.module.js';
import { KeycloakConfigModule } from '../../../modules/keycloak-administration/keycloak-config.module.js';
import { DbSeedModule } from '../db-seed.module.js';
import { DbSeedRepo } from './db-seed.repo.js';

describe('DbSeedRepo Integration', () => {
    let module: TestingModule;
    let orm: MikroORM;
    let dbSeedRepo: DbSeedRepo;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                DbSeedModule,
                ConfigTestModule,
                KeycloakAdministrationModule,
                MapperTestModule,
                DatabaseTestModule.forRoot({ isDatabaseRequired: true }),
                LoggingTestModule,
            ],
        })
            .overrideModule(KeycloakConfigModule)
            .useModule(KeycloakConfigTestModule.forRoot({ isKeycloakRequired: true }))
            .compile();
        orm = module.get(MikroORM);
        dbSeedRepo = module.get(DbSeedRepo);

        await DatabaseTestModule.setupDatabase(module.get(MikroORM));
    }, 10000000);

    beforeEach(async () => {
        await DatabaseTestModule.clearDatabase(orm);
    });

    afterAll(async () => {
        await orm.close();
        await module.close();
    });

    describe('deleteById', () => {
        it('should not throw when deleting by hash', async () => {
            await expect(dbSeedRepo.deleteById('nonexistent-hash')).resolves.not.toThrow();
        });
    });
});
