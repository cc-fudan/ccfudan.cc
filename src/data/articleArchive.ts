import { getCollection } from 'astro:content';
import { SITE_TARGET } from '../config/site';

export async function articleArchive() {
  const writing = (await getCollection('writing')).filter(p => p.data.tags.includes(SITE_TARGET) || p.data.tags.includes('both'));
  const local = new Map(writing.map(p => [p.slug, p]));
  const entries = new Map<string, {title:string;date:Date;excerpt:string;account:string;href:string;external:boolean}>();
  for (const p of writing) entries.set(p.slug, { ...p.data, account:'站内全文', href:`/writing/${p.slug}`, external:false });
  for (const w of await getCollection('works')) {
    if (w.data.target !== SITE_TARGET && w.data.target !== 'both') continue;
    const slug = w.data.internal || w.slug;
    const post = local.get(slug);
    const href = post ? `/writing/${slug}` : w.data.url;
    if (!href) throw new Error(`Article has no readable destination: ${w.slug}`);
    entries.set(slug, {title:w.data.title,date:w.data.date,excerpt:w.data.excerpt,account:w.data.account,href,external:!post});
  }
  return [...entries.values()].sort((a,b)=>b.date.valueOf()-a.date.valueOf());
}
