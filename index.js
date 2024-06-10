// index.js
const { Client } = require('ssh2');
const axios = require('axios');
const inquirer = require('inquirer');
require('dotenv').config();

const apiKey     = process.env.CHATGPT_API_KEY;
const apiUrl     = process.env?.API_URL_KEY ?? 'https://api.openai.com/v1/chat/completions';
const gptVersion = process.env?.GPT_VERSION ?? 'gpt-4';

async function getResponseFromChatGPT(prompt) {
  try {
    const response = await axios.post(
      apiUrl,
      {
        model: gptVersion,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    return response.data?.choices?.[0]?.message?.content;
  } catch (error) {
    console.error('Error communicating with ChatGPT API:', error);
    return 'An error occurred while communicating with the ChatGPT API.';
  }
}

async function main() {
  const { host, port, username, password, command } = await inquirer.prompt([
    { type: 'input', name: 'host', message: 'Enter SSH host:' },
    { type: 'input', name: 'port', message: 'Enter SSH port:', default: 22 },
    { type: 'input', name: 'username', message: 'Enter SSH username:' },
    { type: 'password', name: 'password', message: 'Enter SSH password:' },
    { type: 'input', name: 'command', message: 'Enter command to execute:' },
  ]);

  const conn = new Client();
  conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec(command, async (err, stream) => {
      if (err) throw err;
      let output = '';

      stream.on('close', async (code, signal) => {
        console.log(`Stream :: close :: code: ${code}, signal: ${signal}`);
        conn.end();

        const chatGptPrompt = `Analyze the following SSH command output: \n\n${output}`;
        const response = await getResponseFromChatGPT(chatGptPrompt);
        console.log('ChatGPT response:', response);
      }).on('data', (data) => {
        output += data.toString();
        console.log(`STDOUT: ${data}`);
      }).stderr.on('data', (data) => {
        output += data.toString();
        console.log(`STDERR: ${data}`);
      });
    });
  }).connect({
    host: host,
    port: port,
    username: username,
    password: password,
  });
}

main();
