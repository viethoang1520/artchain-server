import { UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuctionsService } from '../../auctions/auctions.service';

@WebSocketGateway({ cors: true, namespace: 'auction' })
export class AuctionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly auctionsService: AuctionsService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinAuction')
  async handleJoinAuction(
    @MessageBody() data: { auctionId: number; userId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const { auctionId, userId } = data;

    try {
      const participant = await this.auctionsService.joinAuction(
        auctionId,
        userId,
      );

      socket.join(`auction_${auctionId}`);

      socket.emit('joinedAuction', {
        success: true,
        auctionId,
        message: 'Đã tham gia phiên đấu giá',
        participant,
      });

      socket.to(`auction_${auctionId}`).emit('userJoined', {
        userId,
        auctionId,
        timestamp: new Date(),
      });
    } catch (error) {
      socket.emit('error', {
        success: false,
        message: error.message,
      });
    }
  }

  @SubscribeMessage('placeBid')
  async handlePlaceBid(
    @MessageBody()
    data: { auctionPaintingId: number; bidAmount: number; userId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const { auctionPaintingId, bidAmount, userId } = data;

    try {
      const result = await this.auctionsService.placeBid(
        { auctionPaintingId, bidAmount },
        userId,
      );

      const auctionId = result.auctionPainting.auctionId;

      this.server.to(`auction_${auctionId}`).emit('newBid', {
        auctionPaintingId,
        paintingId: result.auctionPainting.paintingId,
        bidAmount,
        bidderId: userId,
        currentBid: result.auctionPainting.currentBid,
        currentBidderId: result.auctionPainting.currentBidderId,
        timestamp: result.bidHistory.bidTime,
      });

      socket.emit('bidPlaced', {
        success: true,
        message: 'Đặt giá thành công',
        bidHistory: result.bidHistory,
        auctionPainting: result.auctionPainting,
      });
    } catch (error) {
      socket.emit('bidError', {
        success: false,
        message: error.message,
      });
    }
  }
}
