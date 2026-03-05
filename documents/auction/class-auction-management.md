# Auctions Controller

**Prefix:** `auctions`

| No  | Method                   | Description                      |
| --- | ------------------------ | -------------------------------- |
| 1   | `getAuctions()`          | List auctions with query filters |
| 2   | `createAuction()`        | Create a new auction             |
| 3   | `addPaintingToAuction()` | Add a painting to an auction     |
| 4   | `joinAuction()`          | Join an auction session          |
| 5   | `placeBid()`             | Place a bid                      |
| 6   | `getAuctionDetail()`     | Get auction detail by ID         |

# Auction Gateway (WebSocket)

| No  | Method                | Description                           |
| --- | --------------------- | ------------------------------------- |
| 1   | `handleConnection()`  | Handle new WebSocket client connect   |
| 2   | `handleDisconnect()`  | Handle WebSocket client disconnect    |
| 3   | `handleJoinAuction()` | Handle client joining an auction room |
| 4   | `handlePlaceBid()`    | Handle client placing a bid via WS    |
