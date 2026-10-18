import { npmPackageUrl } from "@/lib/packages";

/** "@kinetixui/ui on npm · @kinetixui/tokens on npm", for the names that really are our published npm packages. */
export function NpmLinks({ names }: { names: string[] }) {
  const links = names.flatMap((name) => {
    const href = npmPackageUrl(name);
    return href ? [{ name, href }] : [];
  });
  if (!links.length) return null;
  return (
    <span className="flex min-w-0 flex-wrap gap-x-3 font-sans">
      {links.map(({ name, href }) => (
        <a key={name} href={href} target="_blank" rel="noreferrer" className="min-w-0 text-primary underline underline-offset-2 [overflow-wrap:anywhere]">
          {name} on npm
        </a>
      ))}
    </span>
  );
}
