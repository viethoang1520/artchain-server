import { PayOS } from "@payos/node";

const payOS = new PayOS({
  clientId: '45f0516c-f666-4b9e-a1fa-8a82c0bb11ed',
  apiKey: '42b6a77f-46d1-476a-8db4-d9b19098ce66',
  checksumKey: '3c66468c233ea1bcadbc7dd16706128b0502df570ff6bfae4705d389c3a0c710'
});

export default payOS;