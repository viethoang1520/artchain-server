import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuctionsService } from '../../auctions/auctions.service';
import { AUCTION_EVENTS } from '../events/auction.event';

@WebSocketGateway({ cors: true, namespace: 'auction' })
export class AuctionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private static readonly logger = new Logger(AuctionGateway.name);

  private readonly auctionParticipantRefs = new Map<
    number,
    Map<string, number>
  >();

  private readonly socketAuctionMemberships = new Map<
    string,
    Map<number, string>
  >();

  @WebSocketServer()
  server: Server;

  private static io: Server | null = null;

  afterInit(server: Server) {
    AuctionGateway.io = server;
    AuctionGateway.logger.log('Auction gateway initialized');
  }

  static broadcastNewBid(payload: {
    auctionId: number;
    auctionPaintingId: number;
    paintingId: string;
    bidAmount: number;
    bidderId: string;
    bidderFullName: string | null;
    currentBid: number | null;
    currentBidderId: string | null;
    paintingAuctionEndTime: Date | null;
    timestamp: Date;
  }) {
    if (!AuctionGateway.io) {
      AuctionGateway.logger.warn(
        `[EMIT:${AUCTION_EVENTS.NEW_BID}] Skipped because io is not initialized`,
      );
      return;
    }

    AuctionGateway.logger.log(
      `[EMIT:${AUCTION_EVENTS.NEW_BID}] room=auction_${payload.auctionId} auctionPaintingId=${payload.auctionPaintingId} bidderId=${payload.bidderId} bidAmount=${payload.bidAmount}`,
    );

    AuctionGateway.io
      .to(`auction_${payload.auctionId}`)
      .emit(AUCTION_EVENTS.NEW_BID, {
        auctionPaintingId: payload.auctionPaintingId,
        paintingId: payload.paintingId,
        bidAmount: payload.bidAmount,
        bidderId: payload.bidderId,
        userName: payload.bidderFullName, // Ensure userName is included
        currentBid: payload.currentBid,
        currentBidderId: payload.currentBidderId,
        paintingAuctionEndTime: payload.paintingAuctionEndTime,
        timestamp: payload.timestamp,
      });
  }

  static broadcastCeilPriceReached(payload: {
    auctionId: number;
    auctionPaintingId: number;
    paintingId: string;
    bidderId: string;
    bidderFullName: string | null;
    bidAmount: number;
    ceilPrice: number;
    timestamp: Date;
  }) {
    if (!AuctionGateway.io) {
      AuctionGateway.logger.warn(
        `[EMIT:${AUCTION_EVENTS.CEIL_PRICE_REACHED}] Skipped because io is not initialized`,
      );
      return;
    }

    AuctionGateway.logger.log(
      `[EMIT:${AUCTION_EVENTS.CEIL_PRICE_REACHED}] room=auction_${payload.auctionId} auctionPaintingId=${payload.auctionPaintingId} bidderId=${payload.bidderId} bidAmount=${payload.bidAmount} ceilPrice=${payload.ceilPrice}`,
    );

    AuctionGateway.io
      .to(`auction_${payload.auctionId}`)
      .emit(AUCTION_EVENTS.CEIL_PRICE_REACHED, {
        auctionPaintingId: payload.auctionPaintingId,
        paintingId: payload.paintingId,
        bidderId: payload.bidderId,
        userName: payload.bidderFullName,
        bidAmount: payload.bidAmount,
        ceilPrice: payload.ceilPrice,
        timestamp: payload.timestamp,
      });
  }

  constructor(private readonly auctionsService: AuctionsService) {}

  private getAuctionParticipantCount(auctionId: number): number {
    return this.auctionParticipantRefs.get(auctionId)?.size ?? 0;
  }

  private incrementAuctionParticipant(
    auctionId: number,
    userId: string,
  ): number {
    const participants =
      this.auctionParticipantRefs.get(auctionId) ?? new Map<string, number>();
    participants.set(userId, (participants.get(userId) ?? 0) + 1);
    this.auctionParticipantRefs.set(auctionId, participants);
    return participants.size;
  }

  private decrementAuctionParticipant(
    auctionId: number,
    userId: string,
  ): number {
    const participants = this.auctionParticipantRefs.get(auctionId);

    if (!participants) {
      return 0;
    }

    const currentRefCount = participants.get(userId) ?? 0;

    if (currentRefCount <= 1) {
      participants.delete(userId);
    } else {
      participants.set(userId, currentRefCount - 1);
    }

    if (participants.size === 0) {
      this.auctionParticipantRefs.delete(auctionId);
      return 0;
    }

    return participants.size;
  }

  private upsertSocketAuctionMembership(
    socketId: string,
    auctionId: number,
    userId: string,
  ): number {
    const memberships =
      this.socketAuctionMemberships.get(socketId) ?? new Map<number, string>();
    const previousUserId = memberships.get(auctionId);

    if (previousUserId === userId) {
      return this.getAuctionParticipantCount(auctionId);
    }

    if (previousUserId) {
      this.decrementAuctionParticipant(auctionId, previousUserId);
    }

    const participantCount = this.incrementAuctionParticipant(
      auctionId,
      userId,
    );
    memberships.set(auctionId, userId);
    this.socketAuctionMemberships.set(socketId, memberships);

    return participantCount;
  }

  private removeSocketAuctionMembership(
    socketId: string,
    auctionId: number,
  ): { userId: string; participantCount: number } | null {
    const memberships = this.socketAuctionMemberships.get(socketId);

    if (!memberships) {
      return null;
    }

    const userId = memberships.get(auctionId);

    if (!userId) {
      return null;
    }

    const participantCount = this.decrementAuctionParticipant(
      auctionId,
      userId,
    );
    memberships.delete(auctionId);

    if (memberships.size === 0) {
      this.socketAuctionMemberships.delete(socketId);
    }

    return { userId, participantCount };
  }

  private removeAllSocketAuctionMemberships(
    socketId: string,
  ): Array<{ auctionId: number; userId: string; participantCount: number }> {
    const memberships = this.socketAuctionMemberships.get(socketId);

    if (!memberships) {
      return [];
    }

    const removedMemberships: Array<{
      auctionId: number;
      userId: string;
      participantCount: number;
    }> = [];

    for (const [auctionId, userId] of memberships.entries()) {
      const participantCount = this.decrementAuctionParticipant(
        auctionId,
        userId,
      );
      removedMemberships.push({ auctionId, userId, participantCount });
    }

    this.socketAuctionMemberships.delete(socketId);

    return removedMemberships;
  }

  handleConnection(client: Socket) {
    AuctionGateway.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const removedMemberships = this.removeAllSocketAuctionMemberships(
      client.id,
    );

    for (const removed of removedMemberships) {
      AuctionGateway.logger.log(
        `[EMIT:${AUCTION_EVENTS.USER_LEFT}] room=auction_${removed.auctionId} userId=${removed.userId} participantCount=${removed.participantCount}`,
      );

      this.server
        .to(`auction_${removed.auctionId}`)
        .emit(AUCTION_EVENTS.USER_LEFT, {
          userId: removed.userId,
          auctionId: removed.auctionId,
          participantCount: removed.participantCount,
          timestamp: new Date(),
        });
    }

    AuctionGateway.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(AUCTION_EVENTS.JOIN_AUCTION)
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
      console.log('participant: ', participant);

      socket.join(`auction_${auctionId}`);
      const participantCount = this.upsertSocketAuctionMembership(
        socket.id,
        auctionId,
        userId,
      );

      AuctionGateway.logger.log(
        `[EMIT:${AUCTION_EVENTS.JOINED_AUCTION}] socketId=${socket.id} auctionId=${auctionId} userId=${userId} participantCount=${participantCount}`,
      );

      const auctionStatus =
        await this.auctionsService.getAuctionRealtimeStatus(auctionId);

      socket.emit(AUCTION_EVENTS.JOINED_AUCTION, {
        success: true,
        auctionId,
        message: 'Đã tham gia phiên đấu giá',
        participant,
        participantCount,
        auctionStatus,
      });

      AuctionGateway.logger.log(
        `[EMIT:${AUCTION_EVENTS.USER_JOINED}] room=auction_${auctionId} userId=${userId} participantCount=${participantCount}`,
      );

      socket.to(`auction_${auctionId}`).emit(AUCTION_EVENTS.USER_JOINED, {
        userId,
        auctionId,
        participantCount,
        timestamp: new Date(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      socket.emit(AUCTION_EVENTS.ERROR, {
        success: false,
        message: errorMessage,
      });
    }
  }

  @SubscribeMessage(AUCTION_EVENTS.GET_AUCTION_STATUS)
  async handleGetAuctionStatus(
    @MessageBody() data: { auctionId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const { auctionId } = data;

    try {
      const auctionStatus =
        await this.auctionsService.getAuctionRealtimeStatus(auctionId);

      AuctionGateway.logger.log(
        `[EMIT:${AUCTION_EVENTS.AUCTION_STATUS}] socketId=${socket.id} auctionId=${auctionId}`,
      );

      socket.emit(AUCTION_EVENTS.AUCTION_STATUS, {
        success: true,
        ...auctionStatus,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      AuctionGateway.logger.error(
        `[EMIT:${AUCTION_EVENTS.ERROR}] socketId=${socket.id} auctionId=${auctionId} message=${errorMessage}`,
      );

      socket.emit(AUCTION_EVENTS.ERROR, {
        success: false,
        message: errorMessage,
      });
    }
  }

  @SubscribeMessage(AUCTION_EVENTS.LEAVE_AUCTION)
  handleLeaveAuction(
    @MessageBody() data: { auctionId: number; userId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const { auctionId } = data;
    const roomName = `auction_${auctionId}`;

    socket.leave(roomName);

    const removedMembership = this.removeSocketAuctionMembership(
      socket.id,
      auctionId,
    );

    if (!removedMembership) {
      socket.emit(AUCTION_EVENTS.LEFT_AUCTION, {
        success: false,
        auctionId,
        message: 'Bạn chưa tham gia phiên đấu giá này',
      });
      return;
    }

    AuctionGateway.logger.log(
      `[EMIT:${AUCTION_EVENTS.LEFT_AUCTION}] socketId=${socket.id} auctionId=${auctionId} userId=${removedMembership.userId} participantCount=${removedMembership.participantCount}`,
    );

    socket.emit(AUCTION_EVENTS.LEFT_AUCTION, {
      success: true,
      auctionId,
      message: 'Đã rời phiên đấu giá',
      participantCount: removedMembership.participantCount,
    });

    AuctionGateway.logger.log(
      `[EMIT:${AUCTION_EVENTS.USER_LEFT}] room=${roomName} userId=${removedMembership.userId} participantCount=${removedMembership.participantCount}`,
    );

    socket.to(roomName).emit(AUCTION_EVENTS.USER_LEFT, {
      userId: removedMembership.userId,
      auctionId,
      participantCount: removedMembership.participantCount,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage(AUCTION_EVENTS.PLACE_BID)
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

      AuctionGateway.logger.log(
        `[EMIT:${AUCTION_EVENTS.NEW_BID}] room=auction_${auctionId} auctionPaintingId=${auctionPaintingId} bidderId=${userId} bidAmount=${bidAmount}`,
      );

      this.server.to(`auction_${auctionId}`).emit(AUCTION_EVENTS.NEW_BID, {
        auctionPaintingId,
        paintingId: result.auctionPainting.paintingId,
        bidAmount,
        bidderId: userId,
        userName: result.bidderFullName,
        currentBid: result.auctionPainting.currentBid,
        currentBidderId: result.auctionPainting.currentBidderId,
        paintingAuctionEndTime: result.auctionPainting.auctionEndTime,
        timestamp: result.bidHistory.bidTime,
      });

      if (result.shouldEmitCeilPriceReached && result.ceilPrice !== null) {
        AuctionGateway.logger.log(
          `[EMIT:${AUCTION_EVENTS.CEIL_PRICE_REACHED}] room=auction_${auctionId} auctionPaintingId=${auctionPaintingId} bidderId=${userId} bidAmount=${bidAmount} ceilPrice=${result.ceilPrice}`,
        );

        this.server
          .to(`auction_${auctionId}`)
          .emit(AUCTION_EVENTS.CEIL_PRICE_REACHED, {
            auctionPaintingId,
            paintingId: result.auctionPainting.paintingId,
            bidderId: userId,
            userName: result.bidderFullName,
            bidAmount,
            ceilPrice: result.ceilPrice,
            timestamp: result.bidHistory.bidTime,
          });
      }

      AuctionGateway.logger.log(
        `[EMIT:${AUCTION_EVENTS.BID_PLACED}] socketId=${socket.id} auctionId=${auctionId} userId=${userId}`,
      );

      socket.emit(AUCTION_EVENTS.BID_PLACED, {
        success: true,
        message: 'Đặt giá thành công',
        bidHistory: result.bidHistory,
        auctionPainting: result.auctionPainting,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      AuctionGateway.logger.error(
        `[EMIT:${AUCTION_EVENTS.BID_ERROR}] socketId=${socket.id} auctionPaintingId=${auctionPaintingId} userId=${userId} message=${errorMessage}`,
      );

      socket.emit(AUCTION_EVENTS.BID_ERROR, {
        success: false,
        message: errorMessage,
      });
    }
  }
}
