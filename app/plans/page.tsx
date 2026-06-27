import { BrandHeader } from '@/components/site/brand-header';

const planFamilies = [
  ['Elite', 'Premium rotation with veg and non-veg variants for lunch and dinner.'],
  ['Basic', 'Everyday balanced subscription plans for consistent weekday meals.'],
  ['Weight Loss', 'Calorie-conscious plans powered by the 24-service-day nutrition cycle.'],
  ['Smoothie', 'Smoothie and gut-booster plan family from the uploaded plan master.']
];

export default function PlansPage() {
  return (
    <main className="min-h-screen bg-cream text-forest">
      <BrandHeader active="Subscription" />
      <section className="px-6 py-16 md:px-12 lg:px-16">
        <p className="editorial-label text-accentRed">Subscription</p>
        <h1 className="mt-3 max-w-5xl font-serif text-6xl leading-none md:text-8xl">A health ritual, delivered weekly.</h1>
        <p className="mt-8 max-w-3xl text-xl leading-8 text-charcoal">Plans are imported from the Cherish plan master CSV and managed permanently from the admin panel.</p>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {planFamilies.map(([title, body]) => (
            <article key={title} className="border border-line bg-ivory p-8">
              <p className="editorial-label text-muted">Plan Family</p>
              <h2 className="mt-4 font-serif text-4xl">{title}</h2>
              <p className="mt-5 leading-7 text-charcoal">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
