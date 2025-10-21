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
import { RollenmappingCreateBodyParams as RollenmappingCreateBodyParams } from './rollenmapping-create-body.params.js';
import { ServiceProviderRepo } from '../../service-provider/repo/service-provider.repo.js';
import { ServiceProvider } from '../../service-provider/domain/service-provider.js';

@UseFilters(new SchulConnexValidationErrorFilter())
@ApiTags('rollenmapping')
@ApiBearerAuth()
@ApiOAuth2(['openid'])
@Controller({ path: 'rollenmapping' })
export class RollenmappingController {
    public constructor(
        private readonly rollenMappingRepo: RollenMappingRepo,
        private readonly rollenMappingFactory: RollenMappingFactory,
        private readonly serviceProviderRepo: ServiceProviderRepo,
        private readonly logger: ClassLogger,
    ) {}

    @Get(':id')
    @ApiOkResponse({ description: 'The rollenmapping was successfully returned', type: RollenMapping })
    @ApiUnauthorizedResponse({ description: 'Unauthorized to retrieve the rollenmapping' })
    @ApiNotFoundResponse({ description: 'No rollenmapping found' })
    @ApiForbiddenResponse({ description: 'Insufficient rights to retrieve the rollenmapping' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error while retrieving the rollenmapping' })
    public async getRollenmappingWithId(
        @Param('id') id: string,
        @Permissions() personPermission: PersonPermissions,
    ): Promise<RollenMapping<true>> {
        const rollenmapping: Option<RollenMapping<true>> = await this.rollenMappingRepo.findById(id);

        if (!rollenmapping) {
            this.logger.error(`No rollenmapping object found with id ${id}`);
            throw new NotFoundException(`No rollenmapping object found with id ${id}`);
        }
        const serviceProvider: Option<ServiceProvider<true>> = await this.serviceProviderRepo.findById(
            rollenmapping.serviceProviderId,
        );
        if (
            !(await personPermission.hasSystemrechtAtOrganisation(
                serviceProvider!.providedOnSchulstrukturknoten,
                RollenSystemRecht.ROLLEN_VERWALTEN,
            ))
        ) {
            this.logger.error(`Insufficient rights to retrieve the rollenmapping at this organization with id ${id}`);
            throw new ForbiddenException(
                `Insufficient rights to retrieve the rollenmapping at this organization with id ${id}`,
            );
        }

        return rollenmapping;
    }

    @Get()
    @ApiOkResponse({
        description: 'The available rollenmapping objects were successfully returned',
        type: [RollenMapping],
    })
    @ApiUnauthorizedResponse({ description: 'Unauthorized to retrieve the rollenmapping' })
    @ApiNotFoundResponse({ description: 'No rollenmapping objects found' })
    @ApiForbiddenResponse({ description: 'Insufficient rights to retrieve the rollenmapping objects' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error while retrieving the rollenmapping objects' })
    public async getAllAvailableRollenmapping(
        @Permissions() personPermission: PersonPermissions,
    ): Promise<RollenMapping<true>[]> {
        const rollenmappingArray: Option<RollenMapping<true>[]> = await this.rollenMappingRepo.find();

        rollenmappingArray.filter(async (rollenmapping: RollenMapping<true>) => {
            const serviceProvider: Option<ServiceProvider<true>> = await this.serviceProviderRepo.findById(
                rollenmapping.serviceProviderId,
            );

            if (
                !(await personPermission.hasSystemrechtAtOrganisation(
                    serviceProvider!.providedOnSchulstrukturknoten,
                    RollenSystemRecht.ROLLEN_VERWALTEN,
                ))
            ) {
                return false;
            }
            return true;
        });

        if (!rollenmappingArray || rollenmappingArray.length === 0) {
            this.logger.error(`No rollenmapping objects found for the organizations within your editing rights`);
            throw new NotFoundException(
                `No rollenmapping objects found for the organizations within your editing rights`,
            );
        }

        return rollenmappingArray;
    }

    @Get(':serviceProviderId/available')
    @ApiOkResponse({
        description: 'The available rollenmapping objects were successfully returned',
        type: [RollenMapping],
    })
    @ApiUnauthorizedResponse({ description: 'Unauthorized to retrieve the rollenmapping' })
    @ApiNotFoundResponse({ description: 'No rollenmapping objects found' })
    @ApiForbiddenResponse({ description: 'Insufficient rights to retrieve the rollenmapping objects' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error while retrieving the rollenmapping objects' })
    public async getAvailableRollenmappingForServiceProvider(
        @Param('serviceProviderId') serviceProviderId: string,
        @Permissions() personPermission: PersonPermissions,
    ): Promise<RollenMapping<true>[]> {
        const serviceProvider: Option<ServiceProvider<true>> =
            await this.serviceProviderRepo.findById(serviceProviderId);
        if (serviceProvider?.providedOnSchulstrukturknoten) {
            if (
                !(await personPermission.hasSystemrechtAtOrganisation(
                    serviceProvider?.providedOnSchulstrukturknoten,
                    RollenSystemRecht.ROLLEN_VERWALTEN,
                ))
            ) {
                throw new ForbiddenException(
                    'Insufficient rights to retrieve the rollenmapping objects from this organization',
                );
            }
        }
        const rollenmappingArray: Option<RollenMapping<true>[]> =
            await this.rollenMappingRepo.findByServiceProviderId(serviceProviderId);

        if (!rollenmappingArray || rollenmappingArray.length === 0) {
            this.logger.error(`No rollenmapping objects found for service provider id ${serviceProviderId}`);
            throw new NotFoundException(`No rollenmapping objects found for service provider id ${serviceProviderId}`);
        }

        return rollenmappingArray;
    }

    @Post()
    @ApiOkResponse({ description: 'The rollenmapping was successfully created', type: RollenMapping })
    @ApiUnauthorizedResponse({ description: 'Unauthorized to create the rollenmapping' })
    @ApiBadRequestResponse({ description: 'Invalid input, rollenmapping not created' })
    @ApiForbiddenResponse({ description: 'Insufficient rights to create the rollenmapping' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error while creating the rollenmapping' })
    public async createNewRollenmapping(
        @Query() rollenmappingCreateBodyParams: RollenmappingCreateBodyParams,
        @Permissions() personPermission: PersonPermissions,
    ): Promise<RollenMapping<true>> {
        const serviceProvider: Option<ServiceProvider<true>> = await this.serviceProviderRepo.findById(
            rollenmappingCreateBodyParams.serviceProviderId,
        );
        if (serviceProvider!.providedOnSchulstrukturknoten) {
            if (
                !(await personPermission.hasSystemrechtAtOrganisation(
                    serviceProvider!.providedOnSchulstrukturknoten,
                    RollenSystemRecht.ROLLEN_VERWALTEN,
                ))
            ) {
                throw new ForbiddenException(
                    'Insufficient rights to create the rollenmapping objects into this organization',
                );
            }
        }

        const newRollenmapping: RollenMapping<false> = RollenMapping.createNew(
            rollenmappingCreateBodyParams.rolleId,
            rollenmappingCreateBodyParams.serviceProviderId,
            rollenmappingCreateBodyParams.mapToLmsRolle,
        );
        const savedRollenMapping: RollenMapping<true> = await this.rollenMappingRepo.create(newRollenmapping);

        return savedRollenMapping;
    }

    @Put(':id')
    @ApiOkResponse({ description: 'The rollenmapping was successfully updated', type: RollenMapping })
    @ApiUnauthorizedResponse({ description: 'Unauthorized to update the rollenmapping' })
    @ApiNotFoundResponse({ description: 'No rollenmapping found to update' })
    @ApiForbiddenResponse({ description: 'Insufficient rights to update the rollenmapping' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error while updating the rollenmapping' })
    public async updateExistingRollenmapping(
        @Param('id') id: string,
        @Query('mapToLmsRolle') mapToLmsRolle: string,
        @Permissions() personPermission: PersonPermissions,
    ): Promise<RollenMapping<true>> {
        const originalRollenMapping: Option<RollenMapping<true>> = await this.rollenMappingRepo.findById(id);
        if (!originalRollenMapping) {
            this.logger.error(`No rollenmapping found with id ${id}`);
            throw new NotFoundException(`No rollenmapping found with id ${id}`);
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
                    'Insufficient rights to update the rollenmapping objects in this organization',
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
    @ApiOkResponse({ description: 'The rollenmapping was successfully deleted' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized to delete the rollenmapping' })
    @ApiNotFoundResponse({ description: 'No rollenmapping found to delete' })
    @ApiForbiddenResponse({ description: 'Insufficient rights to delete the rollenmapping' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error while deleting the rollenmapping' })
    public async deleteExistingRollenmapping(
        @Param('id') id: string,
        @Permissions() personPermission: PersonPermissions,
    ): Promise<void> {
        const rollenmapping: Option<RollenMapping<true>> = await this.rollenMappingRepo.findById(id);

        if (!rollenmapping) {
            this.logger.error(`No rollenmapping found with id ${id}`);
            throw new NotFoundException(`No rollenmapping found with id ${id}`);
        } else {
            const serviceProvider: Option<ServiceProvider<true>> = await this.serviceProviderRepo.findById(
                rollenmapping.serviceProviderId,
            );

            if (
                !serviceProvider ||
                !(await personPermission.hasSystemrechtAtOrganisation(
                    serviceProvider.providedOnSchulstrukturknoten,
                    RollenSystemRecht.ROLLEN_VERWALTEN,
                ))
            ) {
                throw new ForbiddenException('Insufficient rights to delete the rollenmapping');
            }
            await this.rollenMappingRepo.delete(id);
        }
    }
}
