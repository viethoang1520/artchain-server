# Users & Profile Management

## Users Controller

**Prefix:** `api/users`

| No  | Method              | Description                          |
| --- | ------------------- | ------------------------------------ |
| 1   | `me()`              | Get authenticated user's own info    |
| 2   | `submissions()`     | Get authenticated user's submissions |
| 3   | `findOne()`         | Get user by ID                       |
| 4   | `update()`          | Update user info                     |
| 5   | `getAchievements()` | Get user's achievements and awards   |

## Profile Controller

**Prefix:** `profile`

> No controller methods defined. User profile data is accessed through the Users controller (`api/users/me`).
> ProfileService has injected repositories for User, Competitor, Examiner, Contest, and ContestExaminer but no public methods are currently exposed.
