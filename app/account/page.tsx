import { BrandHeader } from '@/components/site/brand-header';

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-cream text-forest">
      <BrandHeader active="Subscription" />
      <section className="px-6 py-20 md:px-12 lg:px-16">
        <p className="editorial-label text-accentRed">Account</p>
        <h1 className="mt-3 font-serif text-6xl">Cherish Account</h1>
        <p className="mt-6 max-w-2xl leading-7 text-charcoal">
          Customer subscription controls, addresses, pauses and swaps will be shown here after sign-in.
        </p>
      </section>
    </main>
  );
}
