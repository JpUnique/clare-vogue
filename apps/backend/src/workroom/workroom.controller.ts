import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import {
  CreateAppointmentDto,
  CreateClientStoryDto,
  CreatePurchaseItemDto,
  ListPurchaseItemsDto,
  UpdateAppointmentDto,
  UpdatePurchaseItemDto,
} from './workroom.dto.js';
import { WorkroomService } from './workroom.service.js';

@ApiTags('workroom')
@ApiBearerAuth()
@Controller()
export class WorkroomController {
  constructor(private readonly workroom: WorkroomService) {}

  @Get('purchase-items')
  @ApiOperation({ summary: 'List the business purchase list' })
  listPurchaseItems(
    @CurrentUser() user: AuthenticatedUser,
    @Query() input: ListPurchaseItemsDto,
  ) {
    return this.workroom.listPurchaseItems(user, input);
  }

  @Post('purchase-items')
  @ApiOperation({ summary: 'Add an item to the business purchase list' })
  createPurchaseItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreatePurchaseItemDto,
  ) {
    return this.workroom.createPurchaseItem(user, input);
  }

  @Patch('purchase-items/:itemId')
  @ApiOperation({ summary: 'Update a purchase item status' })
  updatePurchaseItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() input: UpdatePurchaseItemDto,
  ) {
    return this.workroom.updatePurchaseItem(user, itemId, input);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'List scheduled atelier appointments' })
  listAppointments(@CurrentUser() user: AuthenticatedUser) {
    return this.workroom.listAppointments(user);
  }

  @Post('appointments')
  @ApiOperation({ summary: 'Schedule an atelier appointment' })
  createAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateAppointmentDto,
  ) {
    return this.workroom.createAppointment(user, input);
  }

  @Patch('appointments/:appointmentId')
  @ApiOperation({ summary: 'Update an atelier appointment' })
  updateAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
    @Body() input: UpdateAppointmentDto,
  ) {
    return this.workroom.updateAppointment(user, appointmentId, input);
  }

  @Get('client-stories')
  @ApiOperation({ summary: 'List private customer satisfaction stories' })
  listClientStories(@CurrentUser() user: AuthenticatedUser) {
    return this.workroom.listClientStories(user);
  }

  @Post('client-stories')
  @ApiOperation({
    summary: 'Record private feedback for an uploaded garment video',
  })
  createClientStory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateClientStoryDto,
  ) {
    return this.workroom.createClientStory(user, input);
  }
}
