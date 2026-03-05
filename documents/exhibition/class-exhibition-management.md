# Exhibitions Controller

**Prefix:** `api/exhibitions`

| No  | Method                       | Description                                      |
| --- | ---------------------------- | ------------------------------------------------ |
| 1   | `create()`                   | Create a new exhibition                          |
| 2   | `findAll()`                  | List all exhibitions with optional status filter |
| 3   | `findOne()`                  | Get exhibition detail with paintings             |
| 4   | `update()`                   | Update exhibition info                           |
| 5   | `remove()`                   | Delete exhibition and associated paintings       |
| 6   | `addPaintings()`             | Add multiple paintings to an exhibition          |
| 7   | `removePainting()`           | Remove a painting from an exhibition             |
| 8   | `getPaintingsByExhibition()` | List paintings in an exhibition                  |
| 9   | `updatePaintings()`          | Update 3D position/rotation/scale of paintings   |

# Exhibition3D Gateway (WebSocket)

| No  | Method                          | Description                                 |
| --- | ------------------------------- | ------------------------------------------- |
| 1   | `handleConnection()`            | Handle new WebSocket client connect         |
| 2   | `handleDisconnect()`            | Handle WebSocket client disconnect          |
| 3   | `handleLocalModelUpdate()`      | Handle local 3D model position/state update |
| 4   | `handleLocalModelChatMessage()` | Handle chat message in 3D exhibition        |
