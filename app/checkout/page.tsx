import Link from 'next/link';
import { BrandHeader } from '@/components/site/brand-header';
import { getLatestAddress } from '@/lib/account/queries';

export default async function CheckoutPage() {
  const address = await getLatestAddress();
  const canCheckout = Boolean(address?.is_serviceable);

  return (
    <main className="min-h-screen bg-cream text-forest">
      <BrandHeader active="Subscription" />
      <section className="px-6 py-20 md:px-12 lg:px-16">
        <p className="editorial-label text-accentRed">Checkout</p>
        <h1 className="mt-3 font-serif text-6xl">Begin the Ritual</h1>
        <p className="mt-6 max-w-2xl leading-7 text-charcoal">Checkout is unlocked only for serviceable Cherish delivery addresses.</p>

        <div className="mt-10 max-w-3xl border border-line bg-ivory p-8">
          {address ? (
            <>
              <p className="editorial-label text-muted">Saved Address</p>
              <h2 className="mt-3 font-serif text-3xl">{address.full_address}</h2>
              <p className="mt-4 text-charcoal">Distance: {address.distance_from_kitchen_km ?? '—'} km · Delivery fee: ₹{address.delivery_fee ?? 0}</p>
              {canCheckout ? (
                <div className="mt-6 border border-forest/30 bg-forest/5 p-5 text-forest">Address serviceable. Payment step can be connected next.</div>
              ) : (
                <div className="mt-6 border border-accentRed/30 bg-accentRed/5 p-5 text-accentRed">This address is outside the current delivery area. Payment is disabled.</div>
              )}
            </>
          ) : (
            <>
              <p className="font-serif text-3xl">No address selected</p>
              <p className="mt-4 leading-7 text-charcoal">Validate your address before checkout.</p>
            </>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/account" className="border border-line px-6 py-3 font-mono text-xs uppercase tracking-[0.22em]">Check Address</Link>
            <button disabled={!canCheckout} className="border border-forest bg-forest px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-ivory disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-muted">
              Continue to Payment
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
