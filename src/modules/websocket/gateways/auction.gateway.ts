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
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';

@WebSocketGateway({ cors: true, namespace: 'auction' })
// @UseGuards(AuthGuard) // Temporarily disabled for testing
export class AuctionGateway {
  @SubscribeMessage('event')
  handleEvent() {
    return 'This is the auction gateway';
  }
  @SubscribeMessage('joinAuction')
  handleJoin(@MessageBody() auctionId, @ConnectedSocket() socket) {
    socket.join(`auction_${auctionId}`);
  }

  @SubscribeMessage('placeBid')
  async handlePlaceBid(@MessageBody() bidData, @ConnectedSocket() socket) {
    const { auctionId, bidAmount } = bidData;
    // Logic to process the bid can be added here

    // Notify all participants in the auction room about the new bid
    socket.to(`auction_${auctionId}`).emit('newBid', {
      bidder: socket.id,
      amount: bidAmount,
    });
  }
}
