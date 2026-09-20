import Link from 'next/link';

const TABS = [
  { href: '/', label: '最新' },
  { href: '/ticker/', label: '個股' },
  { href: '/about/', label: '關於' },
];

/** Medium 的 For you｜Featured 樣式：文字 tab，選中者底下一條細線。 */
export default function SecondaryNav({ active }: { active: string }) {
  return (
    <nav className="border-b border-slate-200">
      <ul className="mx-auto flex max-w-[680px] gap-6 px-4">
        {TABS.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className={`-mb-px block border-b py-3 text-[15px] ${
                t.href === active
                  ? 'border-current font-bold'
                  : 'border-transparent text-[#6b6b6b]'
              }`}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
