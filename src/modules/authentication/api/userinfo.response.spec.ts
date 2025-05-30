import { faker } from '@faker-js/faker';
import { createMock } from '@golevelup/ts-jest';
import 'reflect-metadata';
import { DoFactory } from '../../../../test/utils/do-factory.js';
import { OrganisationResponse } from '../../organisation/api/organisation.response.js';
import { OrganisationRepository } from '../../organisation/persistence/organisation.repository.js';
import { TimeLimitOccasion } from '../../person/domain/time-limit-occasion.enums.js';
import { DBiamPersonenkontextRepo } from '../../personenkontext/persistence/dbiam-personenkontext.repo.js';
import { RolleRepo } from '../../rolle/repo/rolle.repo.js';
import { PersonPermissions } from '../domain/person-permissions.js';
import { StepUpLevel } from '../passport/oidc.strategy.js';
import { PersonTimeLimitInfoResponse } from './person-time-limit-info.reponse.js';
import { PersonenkontextRolleFieldsResponse } from './personen-kontext-rolle-fields.response.js';
import { UserinfoExtension, UserinfoResponse } from './userinfo.response.js';

describe('UserinfoResponse', () => {
    const permissions: PersonPermissions = new PersonPermissions(
        createMock<DBiamPersonenkontextRepo>(),
        createMock<OrganisationRepository>(),
        createMock<RolleRepo>(),
        DoFactory.createPerson(true),
    );
    const pk: PersonenkontextRolleFieldsResponse = {
        organisation: new OrganisationResponse(DoFactory.createOrganisation(true)),
        rolle: { systemrechte: [faker.string.alpha()], serviceProviderIds: [faker.string.uuid()] },
    };

    const personTimeLimtit: PersonTimeLimitInfoResponse = {
        occasion: TimeLimitOccasion.KOPERS,
        deadline: faker.date.future().toISOString(),
    };

    it('constructs the object without optional extension', () => {
        const userinfoResponse: UserinfoResponse = new UserinfoResponse(permissions, [pk], StepUpLevel.SILVER, [
            personTimeLimtit,
        ]);
        expect(userinfoResponse).toBeDefined();
        expect(userinfoResponse.password_updated_at).toBeUndefined();
    });

    it('constructs the object with optional extension', () => {
        const extension: UserinfoExtension = { password_updated_at: faker.date.past() };
        const userinfoResponse: UserinfoResponse = new UserinfoResponse(
            permissions,
            [pk],
            StepUpLevel.SILVER,
            [personTimeLimtit],
            extension,
        );
        expect(userinfoResponse).toBeDefined();
        expect(userinfoResponse.password_updated_at).toEqual(extension.password_updated_at?.toISOString());
    });
});
