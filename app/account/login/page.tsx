import { BrandHeader } from '@/components/site/brand-header';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-cream text-forest">
      <BrandHeader active="Subscription" />
      <section className="grid min-h-[calc(100vh-4rem)] place-items-center px-6">
        <div className="w-full max-w-xl border border-line bg-ivory p-8">
          <p className="editorial-label text-accentRed">Sign In</p>
          <h1 className="mt-3 font-serif text-5xl">Access Cherish</h1>
          <p className="mt-5 leading-7 text-charcoal">
            Supabase Auth will connect this screen to customer and admin sign-in during the auth integration step.
          </p>
        </div>
      </section>
    </main>
  );
}
