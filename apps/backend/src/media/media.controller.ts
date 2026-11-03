import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import {
  GrantPortfolioConsentDto,
  RequestMediaUploadDto,
  WithdrawPortfolioConsentDto,
} from './media.dto.js';
import { MediaService } from './media.service.js';

@ApiTags('media')
@ApiBearerAuth()
@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('garments/:garmentId/media/upload-url')
  @ApiOperation({
    summary: 'Request a short-lived URL for a private garment media upload',
  })
  requestUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
    @Body() input: RequestMediaUploadDto,
  ) {
    return this.media.requestUpload(user, garmentId, input);
  }

  @Get('garments/:garmentId/media')
  @ApiOperation({ summary: 'List available private media for a garment' })
  listGarmentMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
  ) {
    return this.media.listGarmentMedia(user, garmentId);
  }

  @Post('media/:mediaId/complete')
  @ApiOperation({
    summary: 'Verify an uploaded media object before making it available',
  })
  completeUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
  ) {
    return this.media.completeUpload(user, mediaId);
  }

  @Get('media/:mediaId/download-url')
  @ApiOperation({ summary: 'Request a short-lived private media download URL' })
  createDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
  ) {
    return this.media.createDownloadUrl(user, mediaId);
  }

  @Delete('media/:mediaId')
  @ApiOperation({ summary: 'Delete private media and retain its metadata' })
  deleteMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
  ) {
    return this.media.deleteMedia(user, mediaId);
  }

  @Post('media/:mediaId/portfolio-consent')
  @ApiOperation({ summary: 'Record item-specific portfolio consent' })
  grantPortfolioConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
    @Body() input: GrantPortfolioConsentDto,
  ) {
    return this.media.grantPortfolioConsent(user, mediaId, input);
  }

  @Post('media/:mediaId/portfolio-consent/withdraw')
  @ApiOperation({ summary: 'Record withdrawal of portfolio consent' })
  withdrawPortfolioConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
    @Body() input: WithdrawPortfolioConsentDto,
  ) {
    return this.media.withdrawPortfolioConsent(user, mediaId, input);
  }

  @Get('media/:mediaId/portfolio-consent')
  @ApiOperation({ summary: 'List a media item’s portfolio consent history' })
  listPortfolioConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
  ) {
    return this.media.listPortfolioConsent(user, mediaId);
  }
}
