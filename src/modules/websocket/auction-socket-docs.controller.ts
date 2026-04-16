import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiProperty,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AUCTION_EVENTS } from './events/auction.event';

class JoinAuctionSocketPayloadDto {
  @ApiProperty({ example: 1 })
  auctionId: number;

  @ApiProperty({ example: 'user_123' })
  userId: string;
}

class PlaceBidSocketPayloadDto {
  @ApiProperty({ example: 11 })
  auctionPaintingId: number;

  @ApiProperty({ example: 1200000 })
  bidAmount: number;

  @ApiProperty({ example: 'user_123' })
  userId: string;
}

@ApiTags('Socket Docs - Auctions')
@Controller('/api/auctions')
export class AuctionSocketDocsController {
  @Get('events')
  @ApiOperation({
    summary: 'Danh sách event của Auction Gateway',
    description:
      'Endpoint chỉ dùng để document cho FE, không thay thế socket runtime.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách event client -> server và server -> client',
    schema: {
      type: 'object',
      properties: {
        namespace: { type: 'string', example: 'auction' },
        clientToServer: {
          type: 'array',
          items: { type: 'string' },
          example: [AUCTION_EVENTS.JOIN_AUCTION, AUCTION_EVENTS.PLACE_BID],
        },
        serverToClient: {
          type: 'array',
          items: { type: 'string' },
          example: [
            AUCTION_EVENTS.JOINED_AUCTION,
            AUCTION_EVENTS.USER_JOINED,
            AUCTION_EVENTS.NEW_BID,
            AUCTION_EVENTS.BID_PLACED,
            AUCTION_EVENTS.BID_ERROR,
            AUCTION_EVENTS.ERROR,
          ],
        },
      },
    },
  })
  getAuctionSocketEvents() {
    return {
      namespace: 'auction',
      clientToServer: [AUCTION_EVENTS.JOIN_AUCTION, AUCTION_EVENTS.PLACE_BID],
      serverToClient: [
        AUCTION_EVENTS.JOINED_AUCTION,
        AUCTION_EVENTS.USER_JOINED,
        AUCTION_EVENTS.NEW_BID,
        AUCTION_EVENTS.BID_PLACED,
        AUCTION_EVENTS.BID_ERROR,
        AUCTION_EVENTS.ERROR,
      ],
    };
  }

  @Post('join-auction')
  @ApiOperation({
    summary: 'Fake REST docs cho event joinAuction',
    description:
      'Mô phỏng payload khi FE emit event joinAuction qua namespace auction.',
  })
  @ApiBody({ type: JoinAuctionSocketPayloadDto })
  @ApiResponse({
    status: 200,
    description: 'Các event server có thể emit sau khi join',
    schema: {
      type: 'object',
      properties: {
        emit: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              event: { type: 'string' },
              to: { type: 'string' },
              payload: { type: 'object' },
            },
          },
          example: [
            {
              event: AUCTION_EVENTS.JOINED_AUCTION,
              to: 'current socket',
              payload: {
                success: true,
                auctionId: 1,
                message: 'Đã tham gia phiên đấu giá',
                participant: {
                  userId: 'user_123',
                },
              },
            },
            {
              event: AUCTION_EVENTS.USER_JOINED,
              to: 'room auction_{auctionId}',
              payload: {
                userId: 'user_123',
                auctionId: 1,
                timestamp: '2026-03-22T10:00:00.000Z',
              },
            },
          ],
        },
      },
    },
  })
  documentJoinAuction(@Body() body: JoinAuctionSocketPayloadDto) {
    return {
      note: 'This endpoint is for Swagger documentation only.',
      receivedPayload: body,
      emit: [
        {
          event: AUCTION_EVENTS.JOINED_AUCTION,
          to: 'current socket',
          payload: {
            success: true,
            auctionId: body.auctionId,
            message: 'Đã tham gia phiên đấu giá',
            participant: {
              userId: body.userId,
            },
          },
        },
        {
          event: AUCTION_EVENTS.USER_JOINED,
          to: `room auction_${body.auctionId}`,
          payload: {
            userId: body.userId,
            auctionId: body.auctionId,
            timestamp: new Date().toISOString(),
          },
        },
      ],
    };
  }

  @Post('place-bid')
  @ApiOperation({
    summary: 'Fake REST docs cho event placeBid',
    description:
      'Mô phỏng payload khi FE emit event placeBid qua namespace auction.',
  })
  @ApiBody({ type: PlaceBidSocketPayloadDto })
  @ApiResponse({
    status: 200,
    description: 'Các event server có thể emit sau khi đặt giá',
    schema: {
      type: 'object',
      properties: {
        emit: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              event: { type: 'string' },
              to: { type: 'string' },
              payload: { type: 'object' },
            },
          },
          example: [
            {
              event: AUCTION_EVENTS.NEW_BID,
              to: 'room auction_{auctionId}',
              payload: {
                auctionPaintingId: 11,
                paintingId: 99,
                bidAmount: 1200000,
                bidderId: 'user_123',
                currentBid: 1200000,
                currentBidderId: 'user_123',
                timestamp: '2026-03-22T10:00:00.000Z',
              },
            },
            {
              event: AUCTION_EVENTS.BID_PLACED,
              to: 'current socket',
              payload: {
                success: true,
                message: 'Đặt giá thành công',
              },
            },
            {
              event: AUCTION_EVENTS.BID_ERROR,
              to: 'current socket',
              payload: {
                success: false,
                message: 'Giá đặt phải cao hơn giá hiện tại',
              },
            },
          ],
        },
      },
    },
  })
  documentPlaceBid(@Body() body: PlaceBidSocketPayloadDto) {
    return {
      note: 'This endpoint is for Swagger documentation only.',
      receivedPayload: body,
      emit: [
        {
          event: AUCTION_EVENTS.NEW_BID,
          to: 'room auction_{auctionId}',
          payload: {
            auctionPaintingId: body.auctionPaintingId,
            paintingId: 0,
            bidAmount: body.bidAmount,
            bidderId: body.userId,
            currentBid: body.bidAmount,
            currentBidderId: body.userId,
            timestamp: new Date().toISOString(),
          },
        },
        {
          event: AUCTION_EVENTS.BID_PLACED,
          to: 'current socket',
          payload: {
            success: true,
            message: 'Đặt giá thành công',
            bidHistory: {},
            auctionPainting: {},
          },
        },
        {
          event: AUCTION_EVENTS.BID_ERROR,
          to: 'current socket',
          payload: {
            success: false,
            message: 'Error message sample',
          },
        },
      ],
    };
  }
}
