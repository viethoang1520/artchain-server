import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway({ cors: true, namespace: 'auction' })
export class AuctionGateway {
  @SubscribeMessage('event')
  handleEvent() {
    return 'This is the auction gateway';
  }
}
