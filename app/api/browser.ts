import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';

interface Tweet {
  username: string;
  text: string;
  date: string;
  url: string;
}
const { Readability } = require('@mozilla/readability');

async function parseTweets(page: puppeteer.Page): Promise<Tweet[]> {
  const html = await page.content();
  const $ = cheerio.load(html);

  const tweets: Tweet[] = [];

  $('[data-testid="tweet"]').each((_, element) => {
    const $element = $(element);
    const $username = $element.find('[data-testid="User-Name"]');
    const tweetHtml = $element.html(); 
    const $time = $element.find('time');
    const dom = new JSDOM(tweetHtml||'');
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

export async function scrape(url: string, auth_token: string) {
  console.log(url)
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--proxy-server=http://127.0.0.1:7890']
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: 375,
    height: 6400,
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

  console.log('Tweets:');
  tweets.forEach(tweet => {
    console.log(`
### [${tweet.username}](${tweet.url})
> ${tweet.text}
> \--${tweet.date}
`);
  });

  await browser.close();
}