import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { join } from 'path';

@Injectable()
export class FirebaseService {
  private storage: admin.storage.Storage;

  constructor() {
    const serviceAccount = require(join(process.cwd(), 'artchain-c46a7-firebase-adminsdk-fbsvc-c7e439fdf3.json')); 
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'gs://artchain-c46a7.firebasestorage.app',
    });
    this.storage = admin.storage();
  }

  getStorage(): admin.storage.Storage {
    return this.storage;
  }
}