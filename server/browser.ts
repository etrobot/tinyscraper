import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import formBody from '@fastify/formbody';
import Database from 'better-sqlite3';

const scraping: boolean = false;
// Open a new database connection
const db = new Database('twitterScraper.db');

// Create the 'tweets' table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS tweets (
    username TEXT, 
    text TEXT, 
    date TEXT, 
    url TEXT PRIMARY KEY
  )
`);

console.log("Database initialized.");

interface Tweet {
  username: string;
  text: string;
  date: string;
  url: string;
}

async function scrapeXlist(url: string, auth_token: string, openAIKey: string, openAIBase: string, browserPath: string, model?: string, proxyURL?: string, prompt?: string) {
  const twitterHtml =  await scrape(url, auth_token, openAIKey, openAIBase, browserPath, model, proxyURL, prompt);
  const $ = cheerio.load(twitterHtml);

  const tweets: Tweet[] = [];

  $('[data-testid="tweet"]').each((_, element) => {
    const $element = $(element);
    const $username = $element.find('[data-testid="User-Name"]');
    const tweetHtml = $element.html();
    const $time = $element.find('time');
    const dom = new JSDOM(tweetHtml || '');

    tweets.push({
      username: $username.text(),
      text: dom.textContent.trim(),
      date: $element.find('time').attr('datetime') || '',
      url: `https://twitter.com${$time.parent().attr('href') || ''}`,
    });
  });

  for (const tweet of tweets) {
    await db.run(`INSERT INTO tweets (username, text, date, url) VALUES (?, ?, ?, ?)`, [tweet.username, tweet.text, tweet.date, tweet.url]);
  }

  console.log('Tweets:', tweets.map(tweet => tweet.username + '\n' + tweet.url + '\n' + tweet.text).join('\n'));
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
  const html = await page.content();
  return html
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
    const { authToken, openAIKey, openAIBase, browserPath, twitterListURL, model, proxyURL } = request.body as any;
    reply.type('text/plain; charset=utf-8').send('scraping');
    await scrapeXlist(twitterListURL, authToken, openAIKey, openAIBase, browserPath, model, proxyURL);
});

fastify.listen({ port: 7540 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server is running on ${address}`);
});
