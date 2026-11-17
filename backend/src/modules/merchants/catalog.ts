/**
 * Merchant catalog: the single source for detection patterns and the
 * "add a subscription" search. `npm run db:seed` writes it to the merchants
 * table.
 *
 * billing:
 *  - FIXED:    same price every cycle (Spotify, Claude)
 *  - USAGE:    billed every cycle but the amount varies (Railway, cloud hosting)
 *  - PURCHASE: the card is on file but charges are one-off buys
 *
 * Typical prices are suggestions that pre-fill the add form; the user edits
 * them. Manage URLs must be re-checked before each store release.
 */
export type Billing = 'FIXED' | 'USAGE' | 'PURCHASE';
export type Cadence = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export type CatalogEntry = {
  slug: string;
  name: string;
  category: string;
  billing: Billing;
  /** Matched against the start of the cleaned statement description, case-insensitive. */
  patterns: string[];
  manageUrl?: string;
  brandColor?: string;
  typical?: { price: number; currency: string; cadence: Cadence };
};

const AI = 'AI tools';
const MUSIC = 'Music';
const VIDEO = 'Video';
const DEV = 'Developer & hosting';
const WORK = 'Productivity';
const STORAGE = 'Cloud storage';
const LEARN = 'Learning';
const GAMES = 'Gaming';
const SOCIAL = 'Social & dating';
const SECURITY = 'Security & VPN';
const HEALTH = 'Health & fitness';
const READ = 'Reading';
const SHOP = 'Shopping & services';

const usd = (price: number, cadence: Cadence = 'MONTHLY') => ({ price, currency: 'USD', cadence });

export const CATALOG: CatalogEntry[] = [
  // AI tools
  { slug: 'chatgpt', name: 'ChatGPT', category: AI, billing: 'FIXED', patterns: ['openai\\W*\\*?\\W*chatgpt', 'chatgpt'], manageUrl: 'https://chatgpt.com/#settings/Account', brandColor: '#10A37F', typical: usd(20) },
  { slug: 'openai-api', name: 'OpenAI API', category: AI, billing: 'USAGE', patterns: ['openai'], manageUrl: 'https://platform.openai.com/settings/organization/billing/overview', brandColor: '#10A37F' },
  { slug: 'claude', name: 'Claude', category: AI, billing: 'FIXED', patterns: ['anthropic', 'claude\\.ai'], manageUrl: 'https://claude.ai/settings/billing', brandColor: '#D97757', typical: usd(20) },
  { slug: 'higgsfield', name: 'Higgsfield', category: AI, billing: 'FIXED', patterns: ['higgsfield'], manageUrl: 'https://higgsfield.ai', brandColor: '#111827', typical: usd(9) },
  { slug: 'midjourney', name: 'Midjourney', category: AI, billing: 'FIXED', patterns: ['midjourney'], manageUrl: 'https://www.midjourney.com/account', brandColor: '#0F172A', typical: usd(10) },
  { slug: 'perplexity', name: 'Perplexity Pro', category: AI, billing: 'FIXED', patterns: ['perplexity'], manageUrl: 'https://www.perplexity.ai/settings/account', brandColor: '#20808D', typical: usd(20) },
  { slug: 'cursor', name: 'Cursor', category: AI, billing: 'FIXED', patterns: ['cursor\\b', 'anysphere'], manageUrl: 'https://cursor.com/settings', brandColor: '#000000', typical: usd(20) },
  { slug: 'github-copilot', name: 'GitHub Copilot', category: AI, billing: 'FIXED', patterns: ['github\\W*copilot'], manageUrl: 'https://github.com/settings/billing', brandColor: '#24292F', typical: usd(10) },
  { slug: 'elevenlabs', name: 'ElevenLabs', category: AI, billing: 'FIXED', patterns: ['elevenlabs', 'eleven labs'], manageUrl: 'https://elevenlabs.io/app/subscription', brandColor: '#000000', typical: usd(5) },
  { slug: 'runway', name: 'Runway', category: AI, billing: 'FIXED', patterns: ['runwayml', 'runway ai'], manageUrl: 'https://app.runwayml.com', brandColor: '#000000', typical: usd(15) },
  { slug: 'suno', name: 'Suno', category: AI, billing: 'FIXED', patterns: ['suno'], manageUrl: 'https://suno.com/account', brandColor: '#000000', typical: usd(10) },
  { slug: 'grok', name: 'X Premium / Grok', category: AI, billing: 'FIXED', patterns: ['x corp', 'twitter', 'xai\\b', 'grok'], manageUrl: 'https://x.com/settings/manage_subscriptions', brandColor: '#000000', typical: usd(8) },
  { slug: 'character-ai', name: 'Character.AI', category: AI, billing: 'FIXED', patterns: ['character\\W*ai'], brandColor: '#1E293B', typical: usd(10) },
  { slug: 'poe', name: 'Poe', category: AI, billing: 'FIXED', patterns: ['poe\\.com', 'quora'], brandColor: '#5D5CDE', typical: usd(20) },
  { slug: 'replit', name: 'Replit', category: AI, billing: 'FIXED', patterns: ['replit'], manageUrl: 'https://replit.com/account', brandColor: '#F26207', typical: usd(25) },
  { slug: 'lovable', name: 'Lovable', category: AI, billing: 'FIXED', patterns: ['lovable'], manageUrl: 'https://lovable.dev', brandColor: '#FF4F64', typical: usd(25) },
  { slug: 'windsurf', name: 'Windsurf', category: AI, billing: 'FIXED', patterns: ['windsurf', 'codeium'], brandColor: '#0B100F', typical: usd(15) },
  { slug: 'grammarly', name: 'Grammarly', category: AI, billing: 'FIXED', patterns: ['grammarly'], manageUrl: 'https://account.grammarly.com/subscription', brandColor: '#15C39A', typical: usd(12) },

  // Google (specific products before the generic Google Play fallback in detection)
  { slug: 'youtube-premium', name: 'YouTube Premium', category: VIDEO, billing: 'FIXED', patterns: ['google\\W*youtube', 'youtube'], manageUrl: 'https://www.youtube.com/paid_memberships', brandColor: '#FF0000', typical: usd(14) },
  { slug: 'google-one', name: 'Google One', category: STORAGE, billing: 'FIXED', patterns: ['google\\W*one\\b'], manageUrl: 'https://one.google.com/storage', brandColor: '#4285F4', typical: usd(2) },
  { slug: 'google-workspace', name: 'Google Workspace', category: WORK, billing: 'FIXED', patterns: ['google\\W*(gsuite|workspace)'], manageUrl: 'https://admin.google.com/ac/billing', brandColor: '#4285F4', typical: usd(7) },
  { slug: 'google-cloud', name: 'Google Cloud', category: DEV, billing: 'USAGE', patterns: ['google\\W*cloud'], manageUrl: 'https://console.cloud.google.com/billing', brandColor: '#4285F4' },

  // Music
  { slug: 'spotify', name: 'Spotify', category: MUSIC, billing: 'FIXED', patterns: ['spotify'], manageUrl: 'https://www.spotify.com/account/subscription/', brandColor: '#1DB954', typical: usd(12) },
  { slug: 'apple-music', name: 'Apple Music', category: MUSIC, billing: 'FIXED', patterns: ['apple\\W*music'], manageUrl: 'https://apps.apple.com/account/subscriptions', brandColor: '#FA243C', typical: usd(11) },
  { slug: 'deezer', name: 'Deezer', category: MUSIC, billing: 'FIXED', patterns: ['deezer'], brandColor: '#A238FF', typical: usd(11) },
  { slug: 'tidal', name: 'Tidal', category: MUSIC, billing: 'FIXED', patterns: ['tidal'], brandColor: '#000000', typical: usd(11) },
  { slug: 'soundcloud', name: 'SoundCloud Go', category: MUSIC, billing: 'FIXED', patterns: ['soundcloud'], brandColor: '#FF5500', typical: usd(10) },

  // Video
  { slug: 'netflix', name: 'Netflix', category: VIDEO, billing: 'FIXED', patterns: ['netflix'], manageUrl: 'https://www.netflix.com/account/membership', brandColor: '#E50914', typical: usd(15) },
  { slug: 'disney-plus', name: 'Disney+', category: VIDEO, billing: 'FIXED', patterns: ['disney\\W*plus', 'disneyplus', 'disney\\+'], manageUrl: 'https://www.disneyplus.com/account', brandColor: '#113CCF', typical: usd(10) },
  { slug: 'prime-video', name: 'Amazon Prime', category: VIDEO, billing: 'FIXED', patterns: ['amazon\\W*prime', 'prime\\W*video', 'amzn\\W*prime'], manageUrl: 'https://www.amazon.com/mc', brandColor: '#00A8E1', typical: usd(15) },
  { slug: 'apple-tv', name: 'Apple TV+', category: VIDEO, billing: 'FIXED', patterns: ['apple\\W*tv'], manageUrl: 'https://apps.apple.com/account/subscriptions', brandColor: '#000000', typical: usd(10) },
  { slug: 'hbo-max', name: 'Max (HBO)', category: VIDEO, billing: 'FIXED', patterns: ['hbo', 'max\\.com'], brandColor: '#002BE7', typical: usd(10) },
  { slug: 'crunchyroll', name: 'Crunchyroll', category: VIDEO, billing: 'FIXED', patterns: ['crunchyroll'], manageUrl: 'https://www.crunchyroll.com/account/membership', brandColor: '#F47521', typical: usd(8) },
  { slug: 'shahid', name: 'Shahid', category: VIDEO, billing: 'FIXED', patterns: ['shahid'], brandColor: '#00B5AD', typical: usd(6) },
  { slug: 'osn-plus', name: 'OSN+', category: VIDEO, billing: 'FIXED', patterns: ['osn'], brandColor: '#000000', typical: usd(9) },
  { slug: 'tapmad', name: 'Tapmad', category: VIDEO, billing: 'FIXED', patterns: ['tapmad'], brandColor: '#F5A623', typical: { price: 299, currency: 'PKR', cadence: 'MONTHLY' } },
  { slug: 'twitch', name: 'Twitch', category: VIDEO, billing: 'FIXED', patterns: ['twitch'], brandColor: '#9146FF', typical: usd(5) },

  // Apple and Microsoft
  { slug: 'apple', name: 'Apple (App Store / iCloud)', category: STORAGE, billing: 'FIXED', patterns: ['apple\\.com\\W*bill', 'apple\\.com', 'itunes'], manageUrl: 'https://apps.apple.com/account/subscriptions', brandColor: '#000000', typical: usd(1) },
  { slug: 'microsoft-365', name: 'Microsoft 365', category: WORK, billing: 'FIXED', patterns: ['microsoft\\W*(365|office)', 'msft\\W*\\*?\\W*(365|office)'], manageUrl: 'https://account.microsoft.com/services', brandColor: '#D83B01', typical: usd(10) },
  { slug: 'xbox', name: 'Xbox Game Pass', category: GAMES, billing: 'FIXED', patterns: ['xbox', 'microsoft\\W*\\*?\\W*xbox'], manageUrl: 'https://account.microsoft.com/services', brandColor: '#107C10', typical: usd(17) },

  // Productivity
  { slug: 'notion', name: 'Notion', category: WORK, billing: 'FIXED', patterns: ['notion'], manageUrl: 'https://www.notion.so/', brandColor: '#000000', typical: usd(10) },
  { slug: 'canva', name: 'Canva Pro', category: WORK, billing: 'FIXED', patterns: ['canva'], manageUrl: 'https://www.canva.com/settings/billing-and-plans', brandColor: '#00C4CC', typical: usd(15) },
  { slug: 'adobe', name: 'Adobe Creative Cloud', category: WORK, billing: 'FIXED', patterns: ['adobe'], manageUrl: 'https://account.adobe.com/plans', brandColor: '#FA0F00', typical: usd(23) },
  { slug: 'figma', name: 'Figma', category: WORK, billing: 'FIXED', patterns: ['figma'], manageUrl: 'https://www.figma.com/settings', brandColor: '#F24E1E', typical: usd(15) },
  { slug: 'zoom', name: 'Zoom', category: WORK, billing: 'FIXED', patterns: ['zoom\\.(com|us)', 'zoom video'], manageUrl: 'https://zoom.us/billing', brandColor: '#0B5CFF', typical: usd(15) },
  { slug: 'slack', name: 'Slack', category: WORK, billing: 'FIXED', patterns: ['slack'], brandColor: '#4A154B', typical: usd(9) },
  { slug: 'dropbox', name: 'Dropbox', category: STORAGE, billing: 'FIXED', patterns: ['dropbox'], manageUrl: 'https://www.dropbox.com/account/plan', brandColor: '#0061FF', typical: usd(12) },
  { slug: 'linear', name: 'Linear', category: WORK, billing: 'FIXED', patterns: ['linear\\W*(app|orbit)'], brandColor: '#5E6AD2', typical: usd(8) },
  { slug: 'linkedin', name: 'LinkedIn Premium', category: WORK, billing: 'FIXED', patterns: ['linkedin'], manageUrl: 'https://www.linkedin.com/premium/manage/', brandColor: '#0A66C2', typical: usd(30) },
  { slug: 'medium', name: 'Medium', category: READ, billing: 'FIXED', patterns: ['medium\\.com', 'medium corp'], brandColor: '#000000', typical: usd(5) },

  // Developer and hosting
  { slug: 'github', name: 'GitHub', category: DEV, billing: 'FIXED', patterns: ['github'], manageUrl: 'https://github.com/settings/billing', brandColor: '#24292F', typical: usd(4) },
  { slug: 'vercel', name: 'Vercel', category: DEV, billing: 'FIXED', patterns: ['vercel'], manageUrl: 'https://vercel.com/account/billing', brandColor: '#000000', typical: usd(20) },
  { slug: 'railway', name: 'Railway', category: DEV, billing: 'USAGE', patterns: ['railway\\b'], manageUrl: 'https://railway.com/account/billing', brandColor: '#0B0D0E' },
  { slug: 'hostinger', name: 'Hostinger', category: DEV, billing: 'USAGE', patterns: ['(www\\.)?hostinger'], manageUrl: 'https://hpanel.hostinger.com/billing', brandColor: '#673DE6' },
  { slug: 'netlify', name: 'Netlify', category: DEV, billing: 'FIXED', patterns: ['netlify'], brandColor: '#00C7B7', typical: usd(19) },
  { slug: 'render', name: 'Render', category: DEV, billing: 'USAGE', patterns: ['render\\.com'], brandColor: '#000000' },
  { slug: 'supabase', name: 'Supabase', category: DEV, billing: 'FIXED', patterns: ['supabase'], brandColor: '#3ECF8E', typical: usd(25) },
  { slug: 'digitalocean', name: 'DigitalOcean', category: DEV, billing: 'USAGE', patterns: ['digitalocean', 'digital ocean'], brandColor: '#0080FF' },
  { slug: 'aws', name: 'Amazon Web Services', category: DEV, billing: 'USAGE', patterns: ['aws\\b', 'amazon web services'], manageUrl: 'https://console.aws.amazon.com/billing/home', brandColor: '#FF9900' },
  { slug: 'cloudflare', name: 'Cloudflare', category: DEV, billing: 'FIXED', patterns: ['cloudflare'], brandColor: '#F38020', typical: usd(5) },
  { slug: 'namecheap', name: 'Namecheap', category: DEV, billing: 'PURCHASE', patterns: ['namecheap'], brandColor: '#DE3723' },
  { slug: 'godaddy', name: 'GoDaddy', category: DEV, billing: 'PURCHASE', patterns: ['godaddy', 'go daddy'], brandColor: '#1BDBDB' },
  { slug: 'heroku', name: 'Heroku', category: DEV, billing: 'USAGE', patterns: ['heroku'], brandColor: '#430098' },
  { slug: 'jetbrains', name: 'JetBrains', category: DEV, billing: 'FIXED', patterns: ['jetbrains'], brandColor: '#000000', typical: usd(25) },

  // Learning
  { slug: 'duolingo', name: 'Duolingo Super', category: LEARN, billing: 'FIXED', patterns: ['duolingo'], brandColor: '#58CC02', typical: usd(7) },
  { slug: 'coursera', name: 'Coursera Plus', category: LEARN, billing: 'FIXED', patterns: ['coursera'], manageUrl: 'https://www.coursera.org/my-purchases', brandColor: '#0056D2', typical: usd(59) },
  { slug: 'udemy', name: 'Udemy', category: LEARN, billing: 'PURCHASE', patterns: ['udemy'], brandColor: '#A435F0' },
  { slug: 'skillshare', name: 'Skillshare', category: LEARN, billing: 'FIXED', patterns: ['skillshare'], brandColor: '#00FF84', typical: usd(14) },

  // Gaming
  { slug: 'playstation-plus', name: 'PlayStation Plus', category: GAMES, billing: 'FIXED', patterns: ['playstation', 'sony\\W*interactive', 'psn\\b'], manageUrl: 'https://www.playstation.com/acct/management', brandColor: '#003791', typical: usd(10) },
  { slug: 'steam', name: 'Steam', category: GAMES, billing: 'PURCHASE', patterns: ['steam\\b', 'steampowered', 'valve'], brandColor: '#171A21' },
  { slug: 'nintendo', name: 'Nintendo Switch Online', category: GAMES, billing: 'FIXED', patterns: ['nintendo'], brandColor: '#E60012', typical: { price: 20, currency: 'USD', cadence: 'YEARLY' } },
  { slug: 'discord', name: 'Discord Nitro', category: GAMES, billing: 'FIXED', patterns: ['discord'], manageUrl: 'https://discord.com/settings/subscriptions', brandColor: '#5865F2', typical: usd(10) },

  // Social and dating
  { slug: 'tinder', name: 'Tinder', category: SOCIAL, billing: 'FIXED', patterns: ['tinder'], brandColor: '#FE3C72', typical: usd(15) },
  { slug: 'bumble', name: 'Bumble', category: SOCIAL, billing: 'FIXED', patterns: ['bumble'], brandColor: '#FFC629', typical: usd(15) },
  { slug: 'snapchat', name: 'Snapchat+', category: SOCIAL, billing: 'FIXED', patterns: ['snapchat', 'snap inc'], brandColor: '#FFFC00', typical: usd(4) },
  { slug: 'telegram', name: 'Telegram Premium', category: SOCIAL, billing: 'FIXED', patterns: ['telegram'], brandColor: '#26A5E4', typical: usd(5) },
  { slug: 'patreon', name: 'Patreon', category: SOCIAL, billing: 'FIXED', patterns: ['patreon'], manageUrl: 'https://www.patreon.com/settings/memberships', brandColor: '#FF424D', typical: usd(5) },
  { slug: 'meta-verified', name: 'Meta Verified', category: SOCIAL, billing: 'FIXED', patterns: ['meta\\W*verified'], brandColor: '#0866FF', typical: usd(15) },
  { slug: 'meta-ads', name: 'Meta Ads', category: SOCIAL, billing: 'USAGE', patterns: ['facebk', 'facebook', 'meta\\W*(ads|platforms)'], manageUrl: 'https://business.facebook.com/billing_hub', brandColor: '#0866FF' },

  // Security and VPN
  { slug: 'nordvpn', name: 'NordVPN', category: SECURITY, billing: 'FIXED', patterns: ['nordvpn', 'nord\\W*sec'], brandColor: '#4687FF', typical: usd(13) },
  { slug: 'expressvpn', name: 'ExpressVPN', category: SECURITY, billing: 'FIXED', patterns: ['expressvpn', 'express vpn'], brandColor: '#DA3940', typical: usd(13) },
  { slug: 'surfshark', name: 'Surfshark', category: SECURITY, billing: 'FIXED', patterns: ['surfshark'], brandColor: '#1EBFBF', typical: usd(15) },
  { slug: '1password', name: '1Password', category: SECURITY, billing: 'FIXED', patterns: ['1password', 'agilebits'], brandColor: '#0572EC', typical: usd(3) },
  { slug: 'proton', name: 'Proton', category: SECURITY, billing: 'FIXED', patterns: ['proton'], brandColor: '#6D4AFF', typical: usd(5) },

  // Health and reading
  { slug: 'calm', name: 'Calm', category: HEALTH, billing: 'FIXED', patterns: ['calm\\.com', 'calm app'], brandColor: '#2C5FE6', typical: { price: 70, currency: 'USD', cadence: 'YEARLY' } },
  { slug: 'headspace', name: 'Headspace', category: HEALTH, billing: 'FIXED', patterns: ['headspace'], brandColor: '#F47D31', typical: usd(13) },
  { slug: 'strava', name: 'Strava', category: HEALTH, billing: 'FIXED', patterns: ['strava'], brandColor: '#FC4C02', typical: usd(12) },
  { slug: 'kindle-unlimited', name: 'Kindle Unlimited', category: READ, billing: 'FIXED', patterns: ['kindle'], brandColor: '#FF9900', typical: usd(12) },
  { slug: 'audible', name: 'Audible', category: READ, billing: 'FIXED', patterns: ['audible'], brandColor: '#F7991C', typical: usd(15) },
  { slug: 'scribd', name: 'Scribd / Everand', category: READ, billing: 'FIXED', patterns: ['scribd', 'everand'], brandColor: '#1E7B85', typical: usd(12) },

  // One-off purchases that keep the card on file
  { slug: 'upwork', name: 'Upwork', category: SHOP, billing: 'PURCHASE', patterns: ['upwork'], brandColor: '#14A800' },
  { slug: 'fiverr', name: 'Fiverr', category: SHOP, billing: 'PURCHASE', patterns: ['fiverr'], brandColor: '#1DBF73' },
  { slug: 'daraz', name: 'Daraz', category: SHOP, billing: 'PURCHASE', patterns: ['daraz'], brandColor: '#F57224' },
  { slug: 'foodpanda', name: 'foodpanda', category: SHOP, billing: 'PURCHASE', patterns: ['foodpanda'], brandColor: '#D70F64' },
  { slug: 'careem', name: 'Careem', category: SHOP, billing: 'PURCHASE', patterns: ['careem'], brandColor: '#00E784' },
  { slug: 'uber', name: 'Uber', category: SHOP, billing: 'PURCHASE', patterns: ['uber\\b'], brandColor: '#000000' },
  { slug: 'amazon', name: 'Amazon', category: SHOP, billing: 'PURCHASE', patterns: ['amazon', 'amzn'], brandColor: '#FF9900' },
  { slug: 'aliexpress', name: 'AliExpress', category: SHOP, billing: 'PURCHASE', patterns: ['aliexpress', 'alibaba'], brandColor: '#E62E04' },
];

export const CATALOG_BY_SLUG = new Map(CATALOG.map((m) => [m.slug, m]));

const compiled = CATALOG.map((entry) => ({
  entry,
  regex: new RegExp(`^(?:${entry.patterns.join('|')})`, 'i'),
}));

export function matchCatalog(cleanDescription: string): CatalogEntry | undefined {
  return compiled.find((c) => c.regex.test(cleanDescription))?.entry;
}
