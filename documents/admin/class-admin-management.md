# Admin Controller

**Prefix:** `api/admin`

| No  | Method                      | Description                                                  |
| --- | --------------------------- | ------------------------------------------------------------ |
| 1   | `getAllAccounts()`          | Get all accounts with pagination and optional role filtering |
| 2   | `banUser()`                 | Ban a user by ID                                             |
| 3   | `activateUser()`            | Activate a user by ID                                        |
| 4   | `getSystemStatistics()`     | Get system-wide overview statistics                          |
| 5   | `getContestStatistics()`    | Get detailed statistics for a specific contest               |
| 6   | `getTopCompetitors()`       | Get top competitors by submissions and awards                |
| 7   | `getTopExaminers()`         | Get top examiners by evaluations count                       |
| 8   | `getMostVotedPaintings()`   | Get paintings with most votes                                |
| 9   | `getUserGrowthStatistics()` | Get user registration growth over time                       |
