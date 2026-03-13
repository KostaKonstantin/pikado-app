import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LiveGateway.name);
  private roomCounts = new Map<string, number>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up room counts
    client.rooms.forEach((room) => {
      const count = (this.roomCounts.get(room) || 1) - 1;
      this.roomCounts.set(room, Math.max(0, count));
    });
  }

  @SubscribeMessage('join:tournament')
  handleJoinTournament(
    @MessageBody() data: { tournamentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `tournament:${data.tournamentId}`;
    client.join(room);
    const count = (this.roomCounts.get(room) || 0) + 1;
    this.roomCounts.set(room, count);
    client.emit('connection:joined', { room, onlineCount: count });
  }

  @SubscribeMessage('leave:tournament')
  handleLeaveTournament(
    @MessageBody() data: { tournamentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `tournament:${data.tournamentId}`;
    client.leave(room);
  }

  @SubscribeMessage('join:screen')
  handleJoinScreen(
    @MessageBody() data: { slug: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `screen:${data.slug}`;
    client.join(room);
    const count = (this.roomCounts.get(room) || 0) + 1;
    this.roomCounts.set(room, count);
    client.emit('connection:joined', { room, onlineCount: count });
  }

  @SubscribeMessage('join:match')
  handleJoinMatch(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `match:${data.matchId}`;
    client.join(room);
    client.emit('connection:joined', { room });
  }

  // Broadcast methods called by services
  broadcastScoreUpdate(tournamentId: string, matchId: string, scores: any) {
    this.server.to(`tournament:${tournamentId}`).emit('score:updated', {
      matchId,
      ...scores,
      timestamp: new Date().toISOString(),
    });
    this.server.to(`match:${matchId}`).emit('score:updated', {
      matchId,
      ...scores,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastMatchComplete(tournamentId: string, matchData: any) {
    this.server.to(`tournament:${tournamentId}`).emit('match:completed', matchData);
    this.server.to(`screen:${matchData.slug}`).emit('match:completed', matchData);
  }

  broadcastBracketUpdate(tournamentId: string, bracket: any) {
    this.server.to(`tournament:${tournamentId}`).emit('bracket:updated', {
      tournamentId,
      bracket,
    });
  }

  broadcastStandingsUpdate(leagueId: string, standings: any) {
    this.server.to(`league:${leagueId}`).emit('standings:updated', {
      leagueId,
      standings,
    });
  }

  broadcastTournamentComplete(tournamentId: string, winnerId: string, winnerName: string) {
    this.server.to(`tournament:${tournamentId}`).emit('tournament:completed', {
      tournamentId,
      winnerId,
      winnerName,
    });
  }
}
