# Campaigns Controller

**Prefix:** `api/campaigns`

| No  | Method                      | Description                                                  |
| --- | --------------------------- | ------------------------------------------------------------ |
| 1   | `getAllCampaigns()`         | Get all campaigns with pagination and optional status filter |
| 2   | `getCampaignDetail()`       | Get campaign detail by ID                                    |
| 3   | `getSponsorsByCampaignId()` | Get all sponsors in a campaign with pagination               |

# Sponsors Controller

**Prefix:** `api/sponsors`

| No  | Method             | Description                                  |
| --- | ------------------ | -------------------------------------------- |
| 1   | `getAllSponsors()` | Get all sponsors with optional status filter |
| 2   | `getSponsorById()` | Get sponsor detail by ID                     |
| 3   | `createSponsor()`  | Create a new sponsor with optional logo file |
