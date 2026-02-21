import admin from 'firebase-admin';

let serviceAccount: any | null = null;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  } catch (e) {
    // Fall back to null; initialize with application default credentials
    serviceAccount = null;
  }
}

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

export default admin;
