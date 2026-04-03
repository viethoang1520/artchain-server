import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('nfts')
export class Nft {
  @PrimaryColumn({
    type: 'varchar',
    length: 255,
    nullable: false,
    name: 'transaction_hash',
  })
  transactionHash: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'cid' })
  cid: string;
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'token_id' })
  tokenId: string;
}
