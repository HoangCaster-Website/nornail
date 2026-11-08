import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { stdin, stdout } from 'node:process';

// Password input is never echoed or written to a file.
if (!stdin.isTTY) throw new Error('Run this command in an interactive terminal.');
stdout.write('New admin password (minimum 14 characters): ');
stdin.setRawMode(true);
stdin.resume();
let password = '';
stdin.on('data', bytes => {
  for (const character of bytes.toString()) {
    if (character === '\u0003') { stdin.setRawMode(false); process.exit(1); }
    if (character === '\r' || character === '\n') {
      stdin.setRawMode(false);
      stdin.pause();
      if (password.length < 14) { stdout.write('\nUse at least 14 characters.\n'); process.exit(1); }
      const salt = randomBytes(16);
      const digest = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
      stdout.write(`\nADMIN_PASSWORD_HASH=${salt.toString('hex')}:${digest.toString('hex')}\nStore this value as a server secret.\n`);
      process.exit(0);
    }
    if (character === '\u007f' || character === '\b') password = password.slice(0, -1);
    else password += character;
  }
});
