import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Person } from '../types';
import { Server, Socket } from 'socket.io';
import {
  EMIT_PERSON_UPDATE,
  EMIT_REMOTE_RECEIVE_CHAT_MESSAGE,
  EMIT_REMOTE_RECEIVE_UPDATE,
  ON_LOCAL_MODEL_CHAT_MESSAGE,
  ON_LOCAL_MODEL_UPDATE,
} from '../events/exhibition.event';
import { LocalModelChatMessageDto, LocalModelUpdateDto } from '../dto';

@WebSocketGateway({ cors: true, namespace: 'exhibition-3D' })
export class Exhibition3DGateway
  implements OnGatewayConnection<Socket>, OnGatewayDisconnect<Socket>
{
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(Exhibition3DGateway.name);
  private persons: Person[] = [];

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    const name = (client.handshake.query.name as string) || `User${client.id}`;
    const person = {
      id: client.id,
      name: name,
      colors: {
        hairColor:
          '#' + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0'),
        skinColor:
          '#' + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0'),
      },
      position: [Math.random() * 4, -0.8, Math.random() * 4] as [
        number,
        number,
        number,
      ],
      rotation: [0, 0, 0, 'XYZ'] as [number, number, number, string],
    };
    this.persons.push(person);
    this.logger.log(this.persons);
    this.logger.log(this.persons.length);

    new Promise((resolve) => setTimeout(resolve, 1000)).then(() => {
      console.log(this.persons);
      console.log(this.persons.length);
      this.server.emit(EMIT_PERSON_UPDATE, this.persons);
    });
  }
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const index = this.persons.findIndex((p) => p.id === client.id);
    if (index !== -1) this.persons.splice(index, 1);
    this.server.emit(EMIT_PERSON_UPDATE, this.persons);
    this.logger.log(this.persons);
    this.logger.log(this.persons.length);
  }

  @SubscribeMessage(ON_LOCAL_MODEL_UPDATE)
  handleLocalModelUpdate(
    @MessageBody() data: LocalModelUpdateDto,
    @ConnectedSocket() client: Socket,
  ) {
    const person = this.persons.find((p) => p.id === data.id);
    if (person) {
      person.position = data.position;
      person.rotation = data.rotation;
    }
    client.broadcast.emit(`${EMIT_REMOTE_RECEIVE_UPDATE}:${data.id}`, data);
  }

  @SubscribeMessage(ON_LOCAL_MODEL_CHAT_MESSAGE)
  handleLocalModelChatMessage(
    @MessageBody() data: LocalModelChatMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log('Chat message received:', data.id);
    client.broadcast.emit(
      `${EMIT_REMOTE_RECEIVE_CHAT_MESSAGE}:${data.id}`,
      data,
    );
  }
}
