import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import formBody from '@fastify/formbody';

interface Tweet {
  username: string;
  text: string;
  date: string;
  url: string;
}
const { Readability } = require('@mozilla/readability');

async function summarizeTweets(tweets: Tweet[], apikey: string, baseurl?: string, model?: string, prompt?: string): Promise<string> {

  const promptText = prompt || '将以上推文用中文总结成要点并附上相关链接';
  // Create a summary prompt from the tweets
  const promptFull = tweets.map(tweet => `${tweet.username}: ${tweet.text} (source: ${tweet.url})`).join('\n\n') + `\n\n${promptText}`;
  const url= baseurl || 'https://api.openai.com/v1';
  const response = await fetch(url+ '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apikey}`
    },
    body: JSON.stringify({
      'model': model || 'gpt-3.5-turbo-0125',
      'messages': [
        {
          'role': 'user',
          'content': promptFull
        }
      ],
      'temperature': 0.7
    })
  });
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  const chatData = data.choices[0]?.message?.content || '';
  return chatData;
}

async function parseTweets(page: puppeteer.Page): Promise<Tweet[]> {
  const html = await page.content();
  const $ = cheerio.load(html);

  const tweets: Tweet[] = [];

  $('[data-testid="tweet"]').each((_, element) => {
    const $element = $(element);
    const $username = $element.find('[data-testid="User-Name"]');
    const tweetHtml = $element.html();
    const $time = $element.find('time');
    const dom = new JSDOM(tweetHtml || '');
    const reader = new Readability(dom.window._document);
    const article = reader.parse();

    tweets.push({
      username: $username.text(),
      text: article.textContent.trim(),
      date: $element.find('time').attr('datetime') || '',
      url: `https://twitter.com${$time.parent().attr('href') || ''}`,
    });
  });

  return tweets;
}

async function scrape(url: string, auth_token: string, openAIKey: string, openAIBase: string, browserPath: string, model?: string, proxyURL?: string, prompt?: string) {

  const config: { headless: boolean; executablePath: string; args?: string[]; } = {
    headless: false,
    executablePath: browserPath,
  };

  if (proxyURL) {
    config.args = ['--proxy-server=' + proxyURL];
  }
  const browser = await puppeteer.launch(config);

  const page = await browser.newPage();

  await page.setViewport({
    width: 375,
    height: 1000,
    deviceScaleFactor: 3,
    isMobile: true,
  });

  await page.setCookie({
    name: 'auth_token',
    value: auth_token,
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    path: '/',
    domain: '.twitter.com',
  });

  await page.goto(url);
  await new Promise(resolve => setTimeout(resolve, 10000));

  const tweets = await parseTweets(page);
  console.log('Tweets:', tweets.map(tweet => tweet.username + '\n' + tweet.url + '\n' + tweet.text).join('\n'));

  await browser.close();
  const summary = await summarizeTweets(tweets, openAIKey, openAIBase, model, prompt)
  return summary;
}

const fastify = Fastify({
  logger: true,
});
fastify.register(formBody);
fastify.register(cors, {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
});

fastify.get('/', async (request, reply) => {
  const formHtml = `
    <html>
      <head>
        <title>Twitter Scraper</title>
      </head>
      <body>
        <form method="post" action="/scrape">
          <label for="authToken">Twitter Auth Token:</label>
          <input type="text" id="authToken" name="authToken" required><br><br>
          <label for="openAIKey">OpenAI Key:</label>
          <input type="text" id="openAIKey" name="openAIKey" required><br><br>
          <label for="openAIBase">OpenAI Base URL:</label>
          <input type="text" id="openAIBase" name="openAIBase" ><br><br>
          <label for="model">model:</label>
          <input type="text" id="model" name="model" ><br><br>
          <label for="browserPath">Browser Path:</label>
          <input type="text" id="browserPath" name="browserPath" required><br><br>
          <label for="twitterListURL">Twitter List URL:</label>
          <input type="text" id="twitterListURL" name="twitterListURL" required><br><br>
          <label for="proxyURL">Proxy URL:</label>
          <input type="text" id="proxyURL" name="proxyURL"><br><br>
          <label for="prompt">prompt:</label>
          <input type="text" id="prompt" name="prompt"><br><br>
          <input type="submit" value="Scrape">
        </form>
      </body>
    </html>
  `;
  reply.type('text/html').send(formHtml);
});

fastify.post('/scrape', async (request, reply) => {
  try {
    const { authToken, openAIKey, openAIBase, browserPath, twitterListURL, model, proxyURL } = request.body as any;
    const summary = await scrape(twitterListURL, authToken, openAIKey, openAIBase, browserPath, model, proxyURL);
    reply.type('text/plain; charset=utf-8').send(summary);
  } catch (error) {
    reply.send({ error: error.toString() });
  }
});

fastify.listen({ port: 7540 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server is running on ${address}`);
});