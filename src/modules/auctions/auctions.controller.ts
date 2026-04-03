import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuctionsService } from './auctions.service';
import {
  CreateAuctionDto,
  PlaceBidDto,
  AddPaintingToAuctionDto,
  QueryAuctionDto,
  GetBidHistoryDto,
  UpdateAuctionStatusDto,
} from './dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuctionGateway } from '../websocket/gateways/auction.gateway';

@ApiTags('Auctions')
@Controller('/api/auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phiên đấu giá' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getAuctions(@Query() queryDto: QueryAuctionDto) {
    return await this.auctionsService.getAuctions(queryDto);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo phiên đấu giá mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  async createAuction(
    @Body() createAuctionDto: CreateAuctionDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return await this.auctionsService.createAuction(createAuctionDto, userId);
  }

  @Post(':auctionId/paintings')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm tranh vào phiên đấu giá' })
  @ApiResponse({ status: 201, description: 'Thêm thành công' })
  async addPaintingToAuction(
    @Param('auctionId') auctionId: number,
    @Body() addPaintingDto: AddPaintingToAuctionDto,
  ) {
    return await this.auctionsService.addPaintingToAuction(
      auctionId,
      addPaintingDto,
    );
  }

  @Post(':auctionId/join')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tham gia phiên đấu giá' })
  @ApiResponse({ status: 201, description: 'Tham gia thành công' })
  async joinAuction(
    @Param('auctionId') auctionId: number,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return await this.auctionsService.joinAuction(auctionId, userId);
  }

  @Post('bids')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đặt giá' })
  @ApiResponse({ status: 201, description: 'Đặt giá thành công' })
  async placeBid(@Body() placeBidDto: PlaceBidDto, @Request() req: any) {
    const userId = req.user.sub;
    const result = await this.auctionsService.placeBid(placeBidDto, userId);

    AuctionGateway.broadcastNewBid({
      auctionId: result.auctionPainting.auctionId,
      auctionPaintingId: result.auctionPainting.auctionPaintingId,
      paintingId: result.auctionPainting.paintingId,
      bidAmount: placeBidDto.bidAmount,
      bidderId: userId,
      bidderFullName: result.bidderFullName,
      currentBid: result.auctionPainting.currentBid,
      currentBidderId: result.auctionPainting.currentBidderId,
      paintingAuctionEndTime: result.auctionPainting.auctionEndTime,
      timestamp: result.bidHistory.bidTime,
    });

    return result;
  }

  @Post(':auctionId/:paintingId/bids')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đặt giá theo phiên và tranh' })
  @ApiResponse({ status: 201, description: 'Đặt giá thành công' })
  async placeBidByAuctionAndPainting(
    @Param('auctionId') auctionId: number,
    @Param('paintingId') paintingId: string,
    @Body('bidAmount') bidAmount: number,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    const result = await this.auctionsService.placeBidByAuctionAndPainting(
      auctionId,
      paintingId,
      bidAmount,
      userId,
    );

    AuctionGateway.broadcastNewBid({
      auctionId: result.auctionPainting.auctionId,
      auctionPaintingId: result.auctionPainting.auctionPaintingId,
      paintingId: result.auctionPainting.paintingId,
      bidAmount,
      bidderId: userId,
      bidderFullName: result.bidderFullName,
      currentBid: result.auctionPainting.currentBid,
      currentBidderId: result.auctionPainting.currentBidderId,
      paintingAuctionEndTime: result.auctionPainting.auctionEndTime,
      timestamp: result.bidHistory.bidTime,
    });

    return result;
  }

  @Get('users/:userId/won-paintings')
  @ApiOperation({ summary: 'Lấy danh sách tranh đấu giá thắng theo userId' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getWonPaintingsByUserId(@Param('userId') userId: string) {
    return await this.auctionsService.getWonPaintingsByUserId(userId);
  }

  @Get('users/:userId/won-paintings/painting/:paintingId')
  @ApiOperation({ summary: 'Lấy chi tiết 1 tranh đấu giá thắng theo userId' })
  @ApiParam({
    name: 'userId',
    description: 'ID người dùng đã thắng đấu giá',
  })
  @ApiParam({
    name: 'paintingId',
    description: 'ID tranh',
  })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy dữ liệu' })
  async getWonPaintingDetailByUserIdAndPaintingId(
    @Param('userId') userId: string,
    @Param('paintingId') paintingId: string,
  ) {
    return await this.auctionsService.getWonPaintingDetailByUserIdAndPaintingId(
      userId,
      paintingId,
    );
  }

  @Get(':auctionId')
  @ApiOperation({ summary: 'Lấy chi tiết phiên đấu giá' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  async getAuctionDetail(@Param('auctionId') auctionId: number) {
    return await this.auctionsService.getAuctionDetail(auctionId);
  }

  @Get('painting/:auctionPaintingId/bid-history')
  @ApiOperation({ summary: 'Lấy lịch sử giá của bức tranh đang được đấu giá' })
  @ApiResponse({
    status: 200,
    description: 'Lấy lịch sử giá thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              bidHistoryId: { type: 'number' },
              bidAmount: { type: 'number' },
              bidTime: { type: 'string', format: 'date-time' },
              status: { type: 'string' },
              bidder: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  avatar: { type: 'string' },
                },
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            totalItems: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  async getBidHistory(
    @Param('auctionPaintingId') auctionPaintingId: number,
    @Query() queryDto: GetBidHistoryDto,
  ) {
    return await this.auctionsService.getBidHistory(
      auctionPaintingId,
      queryDto,
    );
  }

  @Get(':auctionId/:paintingId/bid-history')
  @ApiOperation({
    summary: 'Lấy lịch sử giá của một tranh theo phiên đấu giá',
  })
  @ApiResponse({ status: 200, description: 'Lấy lịch sử giá thành công' })
  async getBidHistoryByAuctionAndPainting(
    @Param('auctionId') auctionId: number,
    @Param('paintingId') paintingId: string,
    @Query() queryDto: GetBidHistoryDto,
  ) {
    return await this.auctionsService.getBidHistoryByAuctionAndPainting(
      auctionId,
      paintingId,
      queryDto,
    );
  }

  @Get(':auctionId/bid-history')
  @ApiOperation({
    summary: 'Lấy lịch sử giá của tất cả bức tranh trong phiên đấu giá',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy lịch sử giá toàn bộ phiên đấu giá thành công',
  })
  async getAuctionBidHistory(
    @Param('auctionId') auctionId: number,
    @Query() queryDto: GetBidHistoryDto,
  ) {
    return await this.auctionsService.getAuctionBidHistory(auctionId, queryDto);
  }

  @Patch(':auctionId/status')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật trạng thái phiên đấu giá' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  @ApiResponse({ status: 400, description: 'Chuyển trạng thái không hợp lệ' })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền thay đổi trạng thái',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phiên đấu giá' })
  async updateAuctionStatus(
    @Param('auctionId') auctionId: number,
    @Body() updateStatusDto: UpdateAuctionStatusDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return await this.auctionsService.updateAuctionStatus(
      auctionId,
      updateStatusDto,
      userId,
    );
  }

  @Patch(':auctionId/end')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kết thúc phiên đấu giá' })
  @ApiResponse({
    status: 200,
    description: 'Kết thúc phiên đấu giá thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Phiên đấu giá không ở trạng thái đang diễn ra',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền kết thúc phiên đấu giá',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phiên đấu giá' })
  async endAuction(@Param('auctionId') auctionId: number, @Request() req: any) {
    const userId = req.user.sub;
    return await this.auctionsService.endAuction(auctionId, userId);
  }
}
