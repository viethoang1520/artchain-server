import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto, PlaceBidDto, AddPaintingToAuctionDto } from './dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Auctions')
@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

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
    return await this.auctionsService.placeBid(placeBidDto, userId);
  }

  @Get(':auctionId')
  @ApiOperation({ summary: 'Lấy chi tiết phiên đấu giá' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  async getAuctionDetail(@Param('auctionId') auctionId: number) {
    return await this.auctionsService.getAuctionDetail(auctionId);
  }
}
