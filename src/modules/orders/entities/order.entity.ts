// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   CreateDateColumn,
//   UpdateDateColumn,
//   ManyToOne,
//   JoinColumn,
// } from 'typeorm';
// import { User } from '../../users/entities/user.entity';

// export enum OrderStatus {
//   PENDING = 'PENDING',
//   CONFIRMED = 'CONFIRMED',
//   PROCESSING = 'PROCESSING',
//   SHIPPED = 'SHIPPED',
//   DELIVERED = 'DELIVERED',
//   CANCELLED = 'CANCELLED',
//   RETURNED = 'RETURNED',
// }

// @Entity('orders')
// export class Order {
//   @PrimaryGeneratedColumn({ name: 'order_id' })
//   orderId: number;

//   @Column({ name: 'user_id', type: 'uuid', nullable: false })
//   userId: string;

//   @Column({
//     name: 'total_amount',
//     type: 'decimal',
//     precision: 15,
//     scale: 2,
//     nullable: false,
//   })
//   totalAmount: number;

//   @Column({
//     name: 'status',
//     type: 'enum',
//     enum: OrderStatus,
//     default: OrderStatus.PENDING,
//   })
//   status: OrderStatus;

//   @Column({ name: 'description', type: 'text', nullable: true })
//   description: string;

//   @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
//   createdAt: Date;

//   @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
//   updatedAt: Date;

//   // Relations
//   @ManyToOne(() => User, (user) => user.orders)
//   @JoinColumn({ name: 'user_id' })
//   user: User;
// }
