import { scrape } from '@/app/api/browser';
// export const runtime = 'edge';
// edge conflicts with duckduckgo-scape
export async function POST(req: Request) {
  const json = await req.json()
  if (json.url) {
    console.log(json)
    const tweets = await scrape(json.url, json.token)
    return tweets
  }
  return 
}