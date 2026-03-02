# WebSocket Gateways

## Exhibition3DGateway

**Namespace:** `exhibition-3D`

| No  | Method                          | Description                                                |
| --- | ------------------------------- | ---------------------------------------------------------- |
| 1   | `handleConnection()`            | Track new client, assign random avatar colors and position |
| 2   | `handleDisconnect()`            | Remove client from persons list, broadcast update          |
| 3   | `handleLocalModelUpdate()`      | Receive position/rotation updates, broadcast to others     |
| 4   | `handleLocalModelChatMessage()` | Receive chat messages, broadcast to others                 |

## AuctionGateway

**Namespace:** `auction`

| No  | Method                | Description                                    |
| --- | --------------------- | ---------------------------------------------- |
| 1   | `handleConnection()`  | Log client connection                          |
| 2   | `handleDisconnect()`  | Log client disconnection                       |
| 3   | `handleJoinAuction()` | Join an auction room, notify others            |
| 4   | `handlePlaceBid()`    | Place a bid, broadcast new bid to auction room |
