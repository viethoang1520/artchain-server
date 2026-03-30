export const AUCTION_EVENTS = {
  // Client to Server Events
  JOIN_AUCTION: 'joinAuction',
  JOIN_PAINTING: 'joinPainting',
  PLACE_BID: 'placeBid',
  LEAVE_AUCTION: 'leaveAuction',
  GET_AUCTION_STATUS: 'getAuctionStatus',

  // Server to Client Events
  JOINED_AUCTION: 'joinedAuction',
  JOINED_PAINTING: 'joinedPainting',
  USER_JOINED: 'userJoined',
  NEW_BID: 'newBid',
  BID_PLACED: 'bidPlaced',
  BID_ERROR: 'bidError',
  LEFT_AUCTION: 'leftAuction',
  USER_LEFT: 'userLeft',
  AUCTION_STATUS: 'auctionStatus',
  AUCTION_STARTED: 'auctionStarted',
  AUCTION_ENDED: 'auctionEnded',
  ERROR: 'error',
} as const;

export type AuctionEventType =
  (typeof AUCTION_EVENTS)[keyof typeof AUCTION_EVENTS];
