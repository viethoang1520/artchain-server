import { handleRetry } from "@nestjs/typeorm";
import { Order } from "src/modules/payments/entities/order.entity";

export interface OrderStrategy {
  handle(order: any) : Promise<void>
}