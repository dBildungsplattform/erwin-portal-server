import { Test, TestingModule } from '@nestjs/testing';
import { ConfigTestModule, DatabaseTestModule, MapperTestModule } from '../../../test/utils/index.js';
import { RollenMappingApiModule } from './rollenmapping-api.module.js';
import { RollenmappingController } from './api/rollenmapping.controller.js';
import { ServiceProviderModule } from '../service-provider/service-provider.module.js';

describe('RollenMappingApiModule', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                ConfigTestModule,
                DatabaseTestModule.forRoot(),
                MapperTestModule,
                RollenMappingApiModule,
                ServiceProviderModule,
            ],
        }).compile();
    });

    afterAll(async () => {
        await module.close();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    describe('when module is initialized', () => {
        it('should resolve RollenMappingController', () => {
            expect(module.get(RollenmappingController)).toBeInstanceOf(RollenmappingController);
        });
    });
});
