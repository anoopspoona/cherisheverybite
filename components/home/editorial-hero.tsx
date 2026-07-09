export function EditorialHero() {
  return (
    <section className="grid min-h-[calc(100vh-4rem)] grid-cols-1 overflow-hidden bg-cream lg:grid-cols-[52%_48%]">
      <div className="flex flex-col justify-center px-6 py-16 md:px-12 lg:px-16">
        <h1 className="font-serif text-[clamp(5.2rem,13vw,13rem)] font-medium leading-[0.78] tracking-[-0.055em] text-forest">
          Cherish
          <span className="block italic text-accentRed">Every</span>
          <span className="block text-forest">Bite</span>
        </h1>
        <p className="mt-10 max-w-2xl font-serif text-2xl leading-relaxed text-charcoal md:text-3xl">
          A daily ritual of Kerala home-style health. Curated in Trivandrum, delivered to your door in a ceremonial unfold of freshness.
        </p>
        <form className="mt-12 flex max-w-2xl flex-col gap-4 sm:flex-row" action="/menu">
          <input
            name="pincode"
            aria-label="Delivery pincode"
            placeholder="Enter Pincode (e.g. 695004)"
            className="h-16 flex-1 border border-line bg-ivory px-6 text-sm text-charcoal outline-none transition focus:border-forest"
          />
          <button className="h-16 bg-forest px-10 font-mono text-xs font-semibold uppercase tracking-[0.28em] text-ivory transition hover:bg-olive" type="submit">
            Begin the Ritual
          </button>
        </form>
      </div>
      <div className="relative min-h-[620px] border-l border-line">
        <img
          src="/assets/cherish-hero-plate.svg"
          alt="Monochrome Kerala health plate"
          className="h-full min-h-[620px] w-full object-cover grayscale"
        />
        <article className="absolute bottom-10 left-0 w-[min(86%,34rem)] border border-line bg-ivory px-8 py-8 shadow-soft md:left-[-3.5rem]">
          <p className="editorial-label text-accentRed">Today&apos;s Plate</p>
          <h2 className="mt-4 font-serif text-4xl text-forest">Mesclun Quinoa Salad</h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            with Paneer Grilled, Cut Fruits, Roasted Sweet Potato, Crunchy Nut Mix
          </p>
        </article>
      </div>
    </section>
  );
}
