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
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
    UseFilters,
} from '@nestjs/common';
import { RollenMapping } from '../domain/rollenmapping.js';
import { RollenMappingRepo } from '../repo/rollenmapping.repo.js';
import { Permissions } from '../../authentication/api/permissions.decorator.js';
import { ClassLogger } from '../../../core/logging/class-logger.js';
import { RollenSystemRecht } from '../../rolle/domain/rolle.enums.js';
import { PersonPermissions } from '../../authentication/domain/person-permissions.js';
import { RollenmappingCreateBodyParams } from './rollenmapping-create-body.params.js';
import { RollenMappingFactory } from '../domain/rollenmapping.factory.js';

@UseFilters()
@ApiTags('rollenmapping')
@ApiBearerAuth()
@ApiOAuth2(['openid'])
@Controller({ path: 'rollenmapping' })
export class RollenmappingController {
    public constructor(
        private readonly rollenMappingRepo: RollenMappingRepo,
        private readonly rollenMappingFactory: RollenMappingFactory,
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
        if (!(await personPermission.hasSystemrechteAtRootOrganisation([RollenSystemRecht.ROLLEN_VERWALTEN]))) {
            throw new ForbiddenException('Insufficient rights to retrieve the rollenmapping objects');
        }

        const rollenmapping: Option<RollenMapping<true>> = await this.rollenMappingRepo.findById(id);

        if (!rollenmapping) {
            this.logger.error(`No rollenmapping object found with id ${id}`);
            throw new NotFoundException(`No rollenmapping object found with id ${id}`);
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
        if (!(await personPermission.hasSystemrechteAtRootOrganisation([RollenSystemRecht.ROLLEN_VERWALTEN]))) {
            throw new ForbiddenException('Insufficient rights to retrieve the rollenmapping objects');
        }

        const rollenmappingArray: Option<RollenMapping<true>[]> = await this.rollenMappingRepo.find();

        if (!rollenmappingArray || rollenmappingArray.length === 0) {
            this.logger.error(`No rollenmapping objects found`);
            throw new NotFoundException(`No rollenmapping objects found`);
        }

        return rollenmappingArray;
    }

    @Post()
    @ApiOkResponse({ description: 'The rollenmapping was successfully created', type: RollenMapping<true> })
    @ApiUnauthorizedResponse({ description: 'Unauthorized to create the rollenmapping' })
    @ApiBadRequestResponse({ description: 'Invalid input, rollenmapping not created' })
    @ApiForbiddenResponse({ description: 'Insufficient rights to create the rollenmapping' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error while creating the rollenmapping' })
    public async createNewRollenmapping(
        @Param() rollenMappingCreateBodyParams: RollenmappingCreateBodyParams,
        @Permissions() personPermission: PersonPermissions,
    ): Promise<RollenMapping<true>> {
        if (!(await personPermission.hasSystemrechteAtRootOrganisation([RollenSystemRecht.ROLLEN_VERWALTEN]))) {
            throw new ForbiddenException('Insufficient rights to create rollenmapping object');
        }

        const newRollenmapping: RollenMapping<false> = this.rollenMappingFactory.createNew(
            rollenMappingCreateBodyParams.rolleId,
            rollenMappingCreateBodyParams.serviceProviderId,
            rollenMappingCreateBodyParams.mapToLmsRolle,
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
        @Body() rollenMappingUpdate: RollenMapping<true>,
        @Permissions() personPermission: PersonPermissions,
    ): Promise<RollenMapping<true>> {
        if (!(await personPermission.hasSystemrechteAtRootOrganisation([RollenSystemRecht.ROLLEN_VERWALTEN]))) {
            throw new ForbiddenException('Insufficient rights to create rollenmapping object');
        }

        if (!(await this.rollenMappingRepo.findById(id))) {
            this.logger.error(`No rollenmapping found with id ${id}`);
            throw new NotFoundException(`No rollenmapping found with id ${id}`);
        }

        const updateRollenMapping: RollenMapping<true> = this.rollenMappingFactory.update(
            rollenMappingUpdate.id,
            rollenMappingUpdate.createdAt,
            new Date(),
            rollenMappingUpdate.rolleId,
            rollenMappingUpdate.serviceProviderId,
            rollenMappingUpdate.mapToLmsRolle,
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
        if (!(await personPermission.hasSystemrechteAtRootOrganisation([RollenSystemRecht.ROLLEN_VERWALTEN]))) {
            throw new ForbiddenException('Insufficient rights to create rollenmapping object');
        }
        if (!(await this.rollenMappingRepo.findById(id))) {
            this.logger.error(`No rollenmapping found with id ${id}`);
            throw new NotFoundException(`No rollenmapping found with id ${id}`);
        }
        await this.rollenMappingRepo.delete(id);
    }
}
