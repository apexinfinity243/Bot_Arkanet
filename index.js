// ===== 私•Λρεχ乂Ιηfιηιτy•ㇱ - BOT ARKANET =====

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const chalk = require('chalk');
const { BOT_NAME, PREFIX, MODE, OWNER_NUMBER } = require('./setting');

// Commandes
const menuCmd  = require('./commands/menu');
const funCmds  = require('./commands/fun');
const aiCmd    = require('./commands/ai');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: [BOT_NAME, 'Chrome', '1.0.0'],
  });

  // QR Code
  sock.ev.on('connection.update', ({ qr, connection, lastDisconnect }) => {
    if (qr) {
      console.log(chalk.yellow('\n📱 Scanne ce QR code avec WhatsApp :\n'));
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      console.log(chalk.green(`\n✅ ${BOT_NAME} connecté avec succès !\n`));
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(chalk.red(`\n❌ Déconnecté. Reconnexion: ${shouldReconnect}`));
      if (shouldReconnect) startBot();
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const sender  = msg.key.remoteJid;
      const isGroup = sender.endsWith('@g.us');
      const pushName = msg.pushName || 'Utilisateur';

      // Mode privé : seulement le propriétaire
      if (MODE === 'private' && sender !== `${OWNER_NUMBER}@s.whatsapp.net`) continue;

      // Récupère le texte
      const body = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption || ''
      ).trim();

      if (!body.startsWith(PREFIX)) continue;

      const [cmd, ...args] = body.slice(PREFIX.length).trim().split(' ');
      const command = cmd.toLowerCase();
      const query   = args.join(' ');

      console.log(chalk.cyan(`[CMD] ${pushName} → ${PREFIX}${command}`));

      // Router les commandes
      switch (command) {
        case 'menu':
        case 'help':
          await menuCmd(sock, msg, sender);
          break;

        case 'ping':
          await funCmds.ping(sock, sender);
          break;

        case 'bonjour':
        case 'hi':
        case 'hello':
          await funCmds.bonjour(sock, sender, pushName);
          break;

        case 'owner':
          await funCmds.owner(sock, sender);
          break;

        case 'ai':
        case 'ask':
          await aiCmd(sock, sender, query);
          break;

        default:
          await sock.sendMessage(sender, {
            text: `❓ Commande inconnue. Tape *${PREFIX}menu* pour voir les commandes.`
          });
      }
    }
  });
}

console.log(chalk.magenta(`
╔══════════════════════════╗
║  ${BOT_NAME}
║  BOT ARKANET - v1.0.0
╚══════════════════════════╝
`));

startBot().catch(console.error);
