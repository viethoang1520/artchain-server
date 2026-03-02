# Notifications Controller

**Prefix:** `api/notifications`

| No  | Method                           | Description                                              |
| --- | -------------------------------- | -------------------------------------------------------- |
| 1   | `addPushTokenForUser()`          | Add a push token for the authenticated user              |
| 2   | `pushNotification()`             | Send push notification to the authenticated user         |
| 3   | `getNotificationsByUserId()`     | Get notifications for the authenticated user (paginated) |
| 4   | `createNotification()`           | Create a new notification                                |
| 5   | `updateNotificationReadStatus()` | Mark notification as read                                |
