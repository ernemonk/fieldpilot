import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

if (!admin.apps.length) {
  const credEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credEnv) {
    // Resolve relative paths against the project root (process.cwd())
    const credPath = path.isAbsolute(credEnv)
      ? credEnv
      : path.resolve(process.cwd(), credEnv);

    if (fs.existsSync(credPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      console.warn(`[firebaseAdmin] Service account file not found at: ${credPath}. Falling back to application default credentials.`);
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } else {
    // No path set — use application default credentials (Cloud Run / GKE etc.)
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

export default admin;
