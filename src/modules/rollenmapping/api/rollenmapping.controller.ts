import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiForbiddenResponse,
    ApiInternalServerErrorResponse,
    ApiNotFoundResponse,
    ApiOAuth2,
    ApiOkResponse,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
    Controller,
    Delete,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
    Query,
    UseFilters,
} from '@nestjs/common';
import { RollenMapping } from '../domain/rollenmapping.js';
import { RollenMappingRepo } from '../repo/rollenmapping.repo.js';
import { Permissions } from '../../authentication/api/permissions.decorator.js';
import { ClassLogger } from '../../../core/logging/class-logger.js';
import { RollenSystemRecht } from '../../rolle/domain/rolle.enums.js';
import { PersonPermissions } from '../../authentication/domain/person-permissions.js';
import { RollenMappingFactory } from '../domain/rollenmapping.factory.js';
import { SchulConnexValidationErrorFilter } from '../../../shared/error/schulconnex-validation-error.filter.js';
import { RollenMappingCreateBodyParams } from './rollenmapping-create-body.params.js';
import { ServiceProviderRepo } from '../../service-provider/repo/service-provider.repo.js';
import { ServiceProvider } from '../../service-provider/domain/service-provider.js';
import { RollenMappingRolleIdResponse } from './rollenmapping-rolle-id-response.js';
import { RollenMappingExtractMappingRequestBody } from './rollenmapping-extract-mapping-request.body.js';
import { RollenMappingService } from './rollenmapping.service.js';
import { RolleID } from '../../../shared/types/index.js';

@UseFilters(new SchulConnexValidationErrorFilter())
@ApiTags('rollenMapping')
@ApiBearerAuth()
@ApiOAuth2(['openid'])
@Controller({ path: 'rollenMapping' })
export class RollenMappingController {
    public constructor(
        private readonly rollenMappingRepo: RollenMappingRepo,
        private readonly rollenMappingFactory: RollenMappingFactory,
        private readonly serviceProviderRepo: ServiceProviderRepo,
        private readonly rollenMappingService: RollenMappingService,
        private readonly logger: ClassLogger,
    ) {}

    @Get(':id')
    @ApiOkResponse({ description: 'The rollenMapping was successfully returned', type: RollenMapping })
    @ApiUnauthorizedResponse({ description: 'Unauthorized to retrieve the rollenMapping' })
    @ApiNotFoundResponse({ description: 'No rollenMapping found' })
    @ApiForbiddenResponse({ description: 'Insufficient rights to retrieve the rollenMapping' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error while retrieving the rollenMapping' })
    public async getRollenMappingWithId(
        @Param('id') id: string,
        @Permissions() personPermission: PersonPermissions,
    ): Promise<RollenMapping<true>> {
        const rollenMapping: Option<RollenMapping<true>> = await this.rollenMappingRepo.findById(id);

        if (!rollenMapping) {
            this.logger.error(`No rollenMapping object found with id ${id}`);
            throw new NotFoundException(`No rollenMapping object found with id ${id}`);
        }
        const serviceProvider: Option<ServiceProvider<true>> = await this.serviceProviderRepo.findById(
            rollenMapping.serviceProviderId,
        );
        if (
            !(await personPermission.hasSystemrechtAtOrganisation(
                serviceProvider!.providedOnSchulstrukturknoten,
                RollenSystemRecht.ROLLEN_VERWALTEN,
            ))
        ) {
            this.logger.error(`Insufficient rights to retrieve the rollenMapping at this organization with id ${id}`);
            throw new ForbiddenException(
                `Insufficient rights to retrieve the rollenMapping at this organization with id ${id}`,
            );
        }

        return rollenMapping;
    }

    @Get()
    @ApiOkResponse({
        description: 'The available rollenMapping objects were successfully returned',
        type: [RollenMapping],
    })
    @ApiUnauthorizedResponse({ description: 'Unauthorized to retrieve the rollenMapping' })
    @ApiNotFoundResponse({ description: 'No rollenMapping objects found' })
    @ApiForbiddenResponse({ description: 'Insufficient rights to retrieve the rollenMapping objects' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error while retrieving the rollenMapping objects' })
    public async getAllAvailableRollenMapping(
        @Permissions() personPermission: PersonPermissions,
    ): Promise<RollenMapping<true>[]> {
        const rollenMappingArray: Option<RollenMapping<true>[]> = await this.rollenMappingRepo.find();

        const permissionChecks: boolean[] = await Promise.all(
            rollenMappingArray.map(async (rollenMapping: RollenMapping<true>) => {
                const serviceProvider: Option<ServiceProvider<true>> = await this.serviceProviderRepo.findById(
                    rollenMapping.serviceProviderId,
                );
                const hasPermission: boolean = await personPermission.hasSystemrechtAtOrganisation(
                    serviceProvider!.providedOnSchulstrukturknoten,
                    RollenSystemRecht.ROLLEN_VERWALTEN,
                );
                return hasPermission;
            }),
        );
        const filteredRollenMappingArray: RollenMapping<true>[] = rollenMappingArray.filter(
            (_: RollenMapping<true>, index: number) => permissionChecks[index],
        );

        if (!filteredRollenMappingArray || filteredRollenMappingArray.length === 0) {
            this.logger.error(`No rollenMapping objects found for the organizations within your editing rights`);
            throw new NotFoundException(
                `No rollenMapping objects found for the organizations within your editing rights`,
            );
        }

        return filteredRollenMappingArray;
    }

    @Get(':serviceProviderId/available')
    @ApiOkResponse({
        description: 'The available rollenMapping objects were successfully returned',
        type: [RollenMapping],
    })
    @ApiUnauthorizedResponse({ description: 'Unauthorized to retrieve the rollenMapping' })
    @ApiNotFoundResponse({ description: 'No rollenMapping objects found' })
    @ApiForbiddenResponse({ description: 'Insufficient rights to retrieve the rollenMapping objects' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error while retrieving the rollenMapping objects' })
    public async getAvailableRollenMappingForServiceProvider(
        @Param('serviceProviderId') serviceProviderId: string,
        @Permissions() personPermission: PersonPermissions,
    ): Promise<RollenMapping<true>[]> {
        const serviceProvider: Option<ServiceProvider<true>> =
            await this.serviceProviderRepo.findById(serviceProviderId);
        if (serviceProvider!.providedOnSchulstrukturknoten) {
            if (
                !(await personPermission.hasSystemrechtAtOrganisation(
                    serviceProvider!.providedOnSchulstrukturknoten,
                    RollenSystemRecht.ROLLEN_VERWALTEN,
                ))
            ) {
                throw new ForbiddenException(
                    'Insufficient rights to retrieve the rollenMapping objects from this organization',
                );
            }
        }
        const rollenMappingArray: Option<RollenMapping<true>[]> =
            await this.rollenMappingRepo.findByServiceProviderId(serviceProviderId);

        if (!rollenMappingArray || rollenMappingArray.length === 0) {
            this.logger.error(`No rollenMapping objects found for service provider id ${serviceProviderId}`);
            throw new NotFoundException(`No rollenMapping objects found for service provider id ${serviceProviderId}`);
        }

        return rollenMappingArray;
    }

    @Post()
    @ApiOkResponse({ description: 'The rollenMapping was successfully created', type: RollenMapping })
    @ApiUnauthorizedResponse({ description: 'Unauthorized to create the rollenMapping' })
    @ApiBadRequestResponse({ description: 'Invalid input, rollenMapping not created' })
    @ApiForbiddenResponse({ description: 'Insufficient rights to create the rollenMapping' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error while creating the rollenMapping' })
    public async createNewRollenMapping(
        @Query() rollenMappingCreateBodyParams: RollenMappingCreateBodyParams,
        @Permissions() personPermission: PersonPermissions,
    ): Promise<RollenMapping<true>> {
        const serviceProvider: Option<ServiceProvider<true>> = await this.serviceProviderRepo.findById(
            rollenMappingCreateBodyParams.serviceProviderId,
        );
        if (serviceProvider!.providedOnSchulstrukturknoten) {
            if (
                !(await personPermission.hasSystemrechtAtOrganisation(
                    serviceProvider!.providedOnSchulstrukturknoten,
                    RollenSystemRecht.ROLLEN_VERWALTEN,
                ))
            ) {
                throw new ForbiddenException(
                    'Insufficient rights to create the rollenMapping objects into this organization',
                );
            }
        }

        const newRollenmapping: RollenMapping<false> = RollenMapping.createNew(
            rollenMappingCreateBodyParams.rolleId,
            rollenMappingCreateBodyParams.serviceProviderId,
            rollenMappingCreateBodyParams.mapToLmsRolle,
        );
        const savedRollenMapping: RollenMapping<true> = await this.rollenMappingRepo.create(newRollenmapping);

        return savedRollenMapping;
    }

    @Put(':id')
    @ApiOkResponse({ description: 'The rollenMapping was successfully updated', type: RollenMapping })
    @ApiUnauthorizedResponse({ description: 'Unauthorized to update the rollenMapping' })
    @ApiNotFoundResponse({ description: 'No rollenMapping found to update' })
    @ApiForbiddenResponse({ description: 'Insufficient rights to update the rollenMapping' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error while updating the rollenMapping' })
    public async updateExistingRollenMapping(
        @Param('id') id: string,
        @Query('mapToLmsRolle') mapToLmsRolle: string,
        @Permissions() personPermission: PersonPermissions,
    ): Promise<RollenMapping<true>> {
        const originalRollenMapping: Option<RollenMapping<true>> = await this.rollenMappingRepo.findById(id);
        if (!originalRollenMapping) {
            this.logger.error(`No rollenMapping found with id ${id}`);
            throw new NotFoundException(`No rollenMapping found with id ${id}`);
        }

        const serviceProvider: Option<ServiceProvider<true>> = await this.serviceProviderRepo.findById(
            originalRollenMapping.serviceProviderId,
        );
        if (serviceProvider!.providedOnSchulstrukturknoten) {
            if (
                !(await personPermission.hasSystemrechtAtOrganisation(
                    serviceProvider!.providedOnSchulstrukturknoten,
                    RollenSystemRecht.ROLLEN_VERWALTEN,
                ))
            ) {
                throw new ForbiddenException(
                    'Insufficient rights to update the rollenMapping objects in this organization',
                );
            }
        }

        const updateRollenMapping: RollenMapping<true> = this.rollenMappingFactory.update(
            originalRollenMapping.id,
            originalRollenMapping.createdAt,
            new Date(),
            originalRollenMapping.rolleId,
            originalRollenMapping.serviceProviderId,
            mapToLmsRolle,
        );
        const savedRollenMapping: RollenMapping<true> = await this.rollenMappingRepo.save(updateRollenMapping);

        return savedRollenMapping;
    }

    @Delete(':id')
    @ApiOkResponse({ description: 'The rollenMapping was successfully deleted' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized to delete the rollenMapping' })
    @ApiNotFoundResponse({ description: 'No rollenMapping found to delete' })
    @ApiForbiddenResponse({ description: 'Insufficient rights to delete the rollenMapping' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error while deleting the rollenMapping' })
    public async deleteExistingRollenMapping(
        @Param('id') id: string,
        @Permissions() personPermission: PersonPermissions,
    ): Promise<void> {
        const rollenMapping: Option<RollenMapping<true>> = await this.rollenMappingRepo.findById(id);

        if (!rollenMapping) {
            this.logger.error(`No rollenMapping found with id ${id}`);
            throw new NotFoundException(`No rollenMapping found with id ${id}`);
        } else {
            const serviceProvider: Option<ServiceProvider<true>> = await this.serviceProviderRepo.findById(
                rollenMapping.serviceProviderId,
            );

            if (serviceProvider) {
                if (
                    !(await personPermission.hasSystemrechtAtOrganisation(
                        serviceProvider.providedOnSchulstrukturknoten,
                        RollenSystemRecht.ROLLEN_VERWALTEN,
                    ))
                ) {
                    throw new ForbiddenException('Insufficient rights to delete the rollenMapping');
                }
            }
            await this.rollenMappingRepo.delete(id);
        }
    }

    @Post('extract-mapping/keycloak')
    @ApiOkResponse({ description: 'Mapping successfully extracted', type: RollenMappingRolleIdResponse })
    @ApiBadRequestResponse({ description: 'Invalid input, mapping not extracted' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized to extract mapping' })
    @ApiForbiddenResponse({ description: 'Insufficient rights to extract mapping' })
    @ApiNotFoundResponse({ description: 'No mapping found for the given user/service provider' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error while extracting mapping' })
    public async getMappingForRolleAndServiceProvider(
        @Query('RollenMappingExtractMappingRequestBody')
        rollenMappingExtractMappingRequestBody: RollenMappingExtractMappingRequestBody,
    ): Promise<RollenMappingRolleIdResponse> {
        const rolleId: RolleID | null = await this.rollenMappingService.getRoleOnServiceProviderByClientName(
            rollenMappingExtractMappingRequestBody.clientName,
            rollenMappingExtractMappingRequestBody.userId,
        );
if (!rolleId) {
    throw new NotFoundException("User doesn't have access to the requested service provider");
}   

const rollenMapping: Option<RollenMapping<true>> = await this.rollenMappingRepo.findByRolleId(rolleId);

if (!rollenMapping) {
    this.logger.error(`No rollenMapping object found with rolleId ${rolleId}`);
    throw new NotFoundException(`No rollenMapping object found with rolleId ${rolleId}`);
}

return new RollenMappingRolleIdResponse(
    rollenMappingExtractMappingRequestBody.userId,
    rollenMapping.mapToLmsRolle,
);
    }
}
