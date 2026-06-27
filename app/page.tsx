import { BrandHeader } from '@/components/site/brand-header';
import { EditorialHero } from '@/components/home/editorial-hero';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-cream text-forest">
      <BrandHeader active="The Concept" />
      <EditorialHero />
      <section className="border-t border-line bg-ivory px-6 py-20 md:px-12 lg:px-16">
        <div className="grid gap-8 lg:grid-cols-3">
          {[
            ['The Concept', 'Kerala home-style food shaped into a daily health ritual.'],
            ['Weekly Menu', 'A 24-service-day rotation from Monday to Saturday, with Sundays closed.'],
            ['Subscription', 'Plans, pauses, swaps and kitchen preparation driven from one source of truth.']
          ].map(([title, body]) => (
            <article key={title} className="border border-line bg-cream p-8">
              <p className="editorial-label text-accentRed">Cherish</p>
              <h2 className="mt-6 font-serif text-4xl">{title}</h2>
              <p className="mt-5 leading-7 text-charcoal">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
