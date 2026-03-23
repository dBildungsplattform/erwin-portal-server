import { Body, Controller, ForbiddenException, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserExternalDataResponse } from './externaldata/user-externaldata.response.js';
import { ExternalPkData } from '../../personenkontext/persistence/dbiam-personenkontext.repo.js';
import { AccessApiKeyGuard } from './access.apikey.guard.js';
import { Public } from './public.decorator.js';
import { KeycloakInternalService } from './keycloakinternal.service.js';

type WithoutOptional<T> = {
    [K in keyof T]-?: T[K];
};

export type RequiredExternalPkData = WithoutOptional<ExternalPkData>;

@ApiTags('Keycloakinternal')
@Controller({ path: 'keycloakinternal' })
export class KeycloakInternalController {
    public constructor(private readonly service: KeycloakInternalService) {}

    /*
    Dieser Endpunkt fragt lediglich Daten ab ist allerdigs trotzdem als POST definiert, da:
    Die Url sollte keine Path oder Query Paremeters haben da Sie statisch in der Keycloak UI hinterlegt werden muss
    Trotzdem muss die Keycloak Sub übermittelt werden (Deshalb POST mit Body)
    */

    @Post('externaldata')
    @HttpCode(200)
    @Public()
    @UseGuards(AccessApiKeyGuard)
    @ApiOperation({ summary: 'External Data about requested in user.' })
    @ApiOkResponse({ description: 'Returns external Data about the requested user.', type: UserExternalDataResponse })
    public async getExternalData(@Body() params: { sub: string }): Promise<UserExternalDataResponse> {
        if (!params.sub) {
            throw new ForbiddenException('Sub must be initialized to provision user');
        }

        return this.service.createUserExternalResponse(params.sub);
    }
}
