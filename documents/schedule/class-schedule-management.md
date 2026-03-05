# Schedule Controller

**Prefix:** —

> No dedicated controller. Schedule management is handled through the Staff controller (`api/staff/schedules/*`).

**Staff Controller — Schedule Methods:**

| No  | Method                     | Description                   |
| --- | -------------------------- | ----------------------------- |
| 1   | `createSchedule()`         | Create an evaluation schedule |
| 2   | `getSchedulesByExaminer()` | Get schedules for an examiner |
| 3   | `getSchedulesByContest()`  | Get schedules for a contest   |
| 4   | `updateSchedule()`         | Update a schedule             |
| 5   | `deleteSchedule()`         | Delete a schedule             |

**Examiners Controller — Schedule Methods:**

**Prefix:** `api/examiners`

| No  | Method             | Description                                  |
| --- | ------------------ | -------------------------------------------- |
| 1   | `getMySchedules()` | Get schedules for the authenticated examiner |
