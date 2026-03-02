# Staff Controller

**Prefix:** `api/staff`

| No  | Method                             | Description                                                    |
| --- | ---------------------------------- | -------------------------------------------------------------- |
| 1   | `createContest()`                  | Create a contest with banner/rule file upload and Round 1      |
| 2   | `updateContest()`                  | Update contest and Round 1 (DRAFT only)                        |
| 3   | `publishContest()`                 | Publish a DRAFT contest                                        |
| 4   | `toggleScheduleEnforcement()`      | Toggle schedule enforcement for examiner evaluation            |
| 5   | `createRound2WithTables()`         | Create Round 2 with configurable tables, auto-seed competitors |
| 6   | `getAllContests()`                 | Get all contests (staff view)                                  |
| 7   | `getContest()`                     | Get a single contest by ID                                     |
| 8   | `getAllSubmissions()`              | Get all submissions                                            |
| 9   | `getPendingSubmissions()`          | Get pending submissions                                        |
| 10  | `getSubmission()`                  | Get a single submission by painting ID                         |
| 11  | `reviewSubmission()`               | Review a submission                                            |
| 12  | `acceptMultipleSubmissions()`      | Accept multiple submissions at once                            |
| 13  | `rejectSubmission()`               | Reject a submission with reason                                |
| 14  | `createRound()`                    | Create a round for a contest                                   |
| 15  | `getRoundsByContest()`             | Get all rounds in a contest grouped by name                    |
| 16  | `getRoundByName()`                 | Get round detail by name                                       |
| 17  | `getRound()`                       | Get a specific round by ID                                     |
| 18  | `updateRound()`                    | Update a round                                                 |
| 19  | `deleteRound()`                    | Delete a round                                                 |
| 20  | `assignExaminerToContest()`        | Assign examiner to a contest                                   |
| 21  | `getExaminersByContest()`          | Get examiners assigned to a contest                            |
| 22  | `removeExaminerFromContest()`      | Remove examiner from a contest                                 |
| 23  | `createCampaign()`                 | Create a campaign with optional image                          |
| 24  | `updateCampaign()`                 | Update a campaign with optional new image                      |
| 25  | `getAllExaminers()`                | Get all examiners                                              |
| 26  | `createSchedule()`                 | Create an evaluation schedule                                  |
| 27  | `getSchedulesByExaminer()`         | Get schedules for an examiner                                  |
| 28  | `getSchedulesByContest()`          | Get schedules for a contest                                    |
| 29  | `updateSchedule()`                 | Update a schedule                                              |
| 30  | `deleteSchedule()`                 | Delete a schedule                                              |
| 31  | `assignAwardToPainting()`          | Assign award to a painting                                     |
| 32  | `unassignAwardFromPainting()`      | Remove award from a painting                                   |
| 33  | `uploadRound2PaintingImage()`      | Upload original image for Round 2 painting                     |
| 34  | `getRound2QualifiedPaintings()`    | Get paintings qualified for Round 2                            |
| 35  | `updateOriginalSubmissionStatus()` | Update original submission status                              |
| 36  | `createPost()`                     | Create a post with optional image upload                       |
| 37  | `getAllPosts()`                    | Get all posts (staff view)                                     |
| 38  | `getPostById()`                    | Get post by ID                                                 |
| 39  | `updatePost()`                     | Update a post                                                  |
| 40  | `softDeletePost()`                 | Soft delete a post                                             |
| 41  | `restorePost()`                    | Restore a soft-deleted post                                    |
| 42  | `publishPost()`                    | Publish a post                                                 |
| 43  | `createTag()`                      | Create a tag                                                   |
| 44  | `getAllTags()`                     | Get all tags                                                   |
| 45  | `deleteTag()`                      | Delete a tag                                                   |
