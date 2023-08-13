const TelegramBot = require('node-telegram-bot-api');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const TOKEN = 'TELEGRAM BOT API KEY HERE'; // Replace with your Telegram bot token

const bot = new TelegramBot(TOKEN, { polling: true });

const emojiMenu = ['🌐', '🔒', '🕵️', '🔍', '🖥️', '🛠️', '🔓', '🔌', '📊', '🔏', '🛡️'];

const scanOptions = [
  { emoji: '🌐', name: 'Network Discovery Scan', description: 'Discovers live hosts on the network.' },
  { emoji: '🔒', name: 'TCP Connect Scan', description: 'Performs a TCP connect scan on the target.' },
  { emoji: '🕵️', name: 'TCP SYN/Stealth Scan', description: 'Performs a stealthy TCP SYN scan.' },
  { emoji: '🔍', name: 'UDP Scan', description: 'Performs a UDP port scan on the target.' },
  { emoji: '🖥️', name: 'OS Detection', description: "Attempts to determine the target's operating system." },
  { emoji: '🛠️', name: 'Version Detection', description: 'Attempts to determine versions of services running on target ports.' },
  { emoji: '🔓', name: 'Vulnerability Detection', description: 'Detects vulnerabilities using Nmap scripts.' },
  { emoji: '🔌', name: 'Specific Port Scan', description: 'Scans a specific port on the target IP.' },
  { emoji: '📊', name: 'Aggressive Scan', description: 'Performs an aggressive scan with more information.' },
  { emoji: '🔏', name: 'Intense Scan', description: 'A more intensive scan that includes all scan types.' },
];

const subscribeMessage = `🚀 Welcome to the NMAP Scan Bot! 🚀\nBefore we start, please consider subscribing to my YouTube channel Hacker101 for awesome content: https://www.youtube.com/@Hacker101vids`;

bot.onText(/\/scan/, async (msg) => {
  const chatId = msg.chat.id;

  // Send the subscribe message with rocket emoji
  await bot.sendMessage(chatId, subscribeMessage);

  const menu = scanOptions
    .map(
      (option, index) =>
        `${option.emoji} ${index + 1}. ${option.name}\n${option.description}`
    )
    .join('\n\n');

  await bot.sendMessage(
    chatId,
    `🔍 Please select a scan option:\n\n${menu}`
  );
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const message = msg.text;

  if (!isNaN(message) && parseInt(message) >= 1 && parseInt(message) <= scanOptions.length) {
    const selectedOption = parseInt(message) - 1;
    const options = [
      '-sn',
      '-sT',
      '-sS',
      '-sU',
      '-O',
      '-sV',
      '-sV --script vuln',
      '-p',
      '-A',
      '-T4 -A -v',
    ];

    let responseMessage = '';
    if (selectedOption === 7) {
      responseMessage = 'Please enter the IP and Port (e.g., 192.168.1.1 80) to scan:';
    } else {
      responseMessage = 'Please enter the IP or target address to scan:';
    }

    await bot.sendMessage(chatId, responseMessage);

    const scanParamsMsg = await new Promise((resolve) => {
      bot.once('message', resolve);
    });

    const scanParams = scanParamsMsg.text.split(' ');

    try {
      let command = '';
      if (selectedOption === 7 && scanParams.length === 2) {
        const [ip, port] = scanParams;
        command = `nmap -p ${port} ${ip}`;
      } else if (scanParams.length === 1) {
        command = `nmap ${options[selectedOption]} ${scanParams[0]}`;
      } else {
        throw new Error('Invalid input. Please enter the correct parameters.');
      }

      // Send the Nmap command to Telegram before executing it
      await bot.sendMessage(chatId, `🔍 Executing Nmap command for "${scanOptions[selectedOption].name}":\n\n${command}`);

      const { stdout, stderr } = await exec(command);
      const styledResults = formatScanResults(stdout);

      const messageChunks = splitIntoChunks(styledResults, 4000); // Adjust chunk size as needed

      for (const chunk of messageChunks) {
        await bot.sendMessage(chatId, `✅ Scan results:\n\n${chunk}`);
      }

      // Send completion message and instructions for a new scan
      await bot.sendMessage(chatId, '✅ Scan completed!');

      await bot.sendMessage(
        chatId,
        `🔍 Start a new scan? If yes, use the /scan command again.`
      );
    } catch (error) {
      await bot.sendMessage(chatId, `An error occurred: ${error.message}`);
    }
  }
});

// Function to split a string into chunks
function splitIntoChunks(text, chunkSize) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

// Function to format scan results
function formatScanResults(results) {
  return results
    .replace(/([0-9]+\/[a-z]+)\s+open/g, '✅ $1 open')
    .replace(/([0-9]+\/[a-z]+)\s+closed/g, '🚫 $1 closed');
}
