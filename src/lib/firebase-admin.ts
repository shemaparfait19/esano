import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Admin SDK once per process
const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: applicationDefault(),
    });

export const adminDb = getFirestore(adminApp);
