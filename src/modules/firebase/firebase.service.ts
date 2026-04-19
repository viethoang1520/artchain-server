import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseService {
  private storage: admin.storage.Storage;

  constructor() {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }

    this.storage = admin.storage();
  }

  getStorage(): admin.storage.Storage {
    return this.storage;
  }

  async pushNotification(message: MulticastMessage) {
    return await getMessaging().sendEachForMulticast({
      ...message,
      android: {
        priority: 'high',
      },
      apns: {
        headers: {
          'apns-priority': '5',
        },
      },
    });
  }
}
