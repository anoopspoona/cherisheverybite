import Link from 'next/link';

const navItems = [
  { href: '/', label: 'The Concept' },
  { href: '/menu', label: 'Weekly Menu' },
  { href: '/plans', label: 'Subscription' }
];

export function BrandHeader({ active = 'The Concept' }: { active?: string }) {
  return (
    <header className="border-b border-line bg-ivory/80 backdrop-blur">
      <nav className="grid min-h-16 grid-cols-[1fr_auto_1fr] items-center px-5 text-forest md:px-8">
        <Link href="/" className="font-serif text-3xl italic leading-none tracking-tight md:text-4xl">
          Cherish
        </Link>
        <div className="hidden items-center gap-14 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`editorial-label transition-colors hover:text-accentRed ${active === item.label ? 'text-accentRed' : 'text-forest'}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="justify-self-end border-b border-forest pb-1 font-mono text-[0.68rem] uppercase tracking-[0.32em]">
          Trivandrum, KL
        </div>
      </nav>
    </header>
  );
}
