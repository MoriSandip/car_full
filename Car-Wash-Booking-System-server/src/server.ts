import dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from 'mongoose';
import app from './app';
import config from './app/config';

async function main() {
  try {
    console.log('Starting CarWash server...');

    // Step 1: Validate JWT secrets
    console.log('Checking JWT configuration...');

    const jwtSecrets = [
      config.jwt_access_secret,
      config.jwt_refresh_secret,
    ];

    if (
      jwtSecrets.some(
        (secret) =>
          !secret ||
          secret.length < 32 ||
          /^(change.?me|secret|password|your.?secret)$/i.test(secret),
      ) ||
      jwtSecrets[0] === jwtSecrets[1]
    ) {
      throw new Error(
        'JWT secrets must be distinct and at least 32 characters.',
      );
    }

    console.log('JWT configuration OK');

    // Step 2: Validate database URL
    console.log('Checking database configuration...');

    if (!config.database_url) {
      throw new Error('DATABASE_URL is not configured.');
    }

    console.log('Database URL found');

    // Step 3: Connect MongoDB
    console.log('Connecting to MongoDB...');

    await mongoose.connect(config.database_url as string);

    console.log('MongoDB connected successfully');

    // Step 4: Start server
    app.listen(config.port, () => {
      console.log(`Server listening on port ${config.port}`);
    });

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Server startup failed (${error.name}).`);
    } else {
      console.error('Server startup failed with an unknown error.');
    }

    process.exitCode = 1;
  }
}

main();