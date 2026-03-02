# Paintings Controller

**Prefix:** `api/paintings`

| No  | Method                             | Description                                               |
| --- | ---------------------------------- | --------------------------------------------------------- |
| 1   | `getPaintingsByContestId()`        | Get paintings by contestId, roundName, status, examinerId |
| 2   | `uploadFile()`                     | Upload a painting image with metadata                     |
| 3   | `evaluatePainting()`               | Evaluate a painting (Round 1 or general)                  |
| 4   | `evaluateRound2Painting()`         | Evaluate a painting for Round 2                           |
| 5   | `getPaintingEvaluations()`         | Get all evaluations for a painting                        |
| 6   | `getRound2PaintingsWithAvgScore()` | Get top 1 painting per table in Round 2                   |
