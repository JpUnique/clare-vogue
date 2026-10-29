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
  CreateCustomerDto,
  CreateMeasurementSetDto,
  ListCustomersDto,
  UpdateCustomerDto,
} from './customer.dto.js';
import { CustomerService } from './customer.service.js';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomerController {
  constructor(private readonly customers: CustomerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer in the owner’s business' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateCustomerDto,
  ) {
    return this.customers.create(user, input);
  }

  @Get()
  @ApiOperation({ summary: 'Search and list business customers' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCustomersDto,
  ) {
    return this.customers.list(user, query);
  }

  @Get(':customerId')
  @ApiOperation({ summary: 'Get a business customer' })
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', new ParseUUIDPipe()) customerId: string,
  ) {
    return this.customers.getById(user, customerId);
  }

  @Patch(':customerId')
  @ApiOperation({ summary: 'Update customer contact details and notes' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', new ParseUUIDPipe()) customerId: string,
    @Body() input: UpdateCustomerDto,
  ) {
    return this.customers.update(user, customerId, input);
  }

  @Post(':customerId/archive')
  @ApiOperation({ summary: 'Archive a customer without deleting history' })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', new ParseUUIDPipe()) customerId: string,
  ) {
    return this.customers.archive(user, customerId);
  }

  @Post(':customerId/restore')
  @ApiOperation({ summary: 'Restore an archived customer' })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', new ParseUUIDPipe()) customerId: string,
  ) {
    return this.customers.restore(user, customerId);
  }

  @Post(':customerId/measurements')
  @ApiOperation({ summary: 'Record an immutable measurement set' })
  addMeasurementSet(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', new ParseUUIDPipe()) customerId: string,
    @Body() input: CreateMeasurementSetDto,
  ) {
    return this.customers.addMeasurementSet(user, customerId, input);
  }

  @Get(':customerId/measurements')
  @ApiOperation({ summary: 'List a customer’s dated measurement sets' })
  listMeasurementSets(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', new ParseUUIDPipe()) customerId: string,
  ) {
    return this.customers.listMeasurementSets(user, customerId);
  }
}
