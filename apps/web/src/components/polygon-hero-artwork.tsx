/**
 * SVG reconstruction of the approved hero composition.
 * The supplied screenshot determines the ribbon silhouette, triangulation, and sweeping tracks.
 * The released KinetixUI semantic tokens determine the actual colors; no raster hero asset is used.
 */
const facets: readonly [string, number][] = [
  ["0,541 129,509 210,591", .30], ["129,509 226,360 339,415", .60],
  ["129,509 339,415 210,591", .35], ["226,360 397,288 339,415", .70],
  ["397,288 515,458 339,415", .35], ["397,288 491,176 599,298", .60],
  ["397,288 599,298 515,458", .80], ["491,176 714,183 599,298", .45],
  ["491,176 662,228 599,298", .55], ["599,298 714,183 795,262", .90],
  ["599,298 795,262 603,390", 1], ["599,298 603,390 515,458", .50],
  ["515,458 603,390 729,430", 1], ["515,458 729,430 468,615", .40],
  ["729,430 795,262 904,319", 1], ["729,430 904,319 866,525", .35],
  ["795,262 856,78 904,319", 1], ["795,262 904,319 980,323", .75],
  ["856,78 980,17 980,323", .90], ["714,183 856,78 795,262", .45],
  ["662,228 714,183 599,298", .85], ["339,415 515,458 359,539", .85],
  ["359,539 515,458 468,615", .95], ["210,591 339,415 359,539", .25],
  ["359,539 468,615 210,591", .55], ["515,458 729,430 603,390", 1],
  ["904,319 980,323 866,525", .40],
];

const connections = [
  "M40 541 129 509 226 360 397 288 491 176 714 183 856 78 980 17",
  "M40 541 210 591 359 539 468 615 866 525 904 319 980 323",
  "M129 509 339 415 515 458 603 390 729 430 795 262 856 78",
  "M226 360 339 415 397 288 599 298 714 183 795 262 904 319",
  "M129 509 226 360 339 415 359 539 515 458 468 615",
  "M397 288 515 458 599 298 603 390 729 430 866 525",
  "M491 176 599 298 662 228 714 183 795 262 980 323",
  "M339 415 210 591 359 539 468 615 515 458 729 430 904 319",
  "M599 298 729 430 795 262 904 319 866 525",
  "M714 183 795 262 856 78 904 319 980 323",
] as const;

const vertices: readonly [number, number][] = [
  [40,541], [129,509], [226,360], [339,415], [397,288], [491,176],
  [599,298], [714,183], [795,262], [856,78], [904,319], [729,430],
  [515,458], [603,390], [468,615], [359,539], [210,591], [662,228],
  [866,525], [450,543], [595,95], [980,323],
];

const routes = [
  "M128 510 C220 459 282 452 339 415 S475 448 515 458 S652 353 795 262",
  "M250 585 C350 555 415 560 475 548 S690 543 866 525",
  "M560 488 C645 463 700 440 729 430 S795 358 834 336",
] as const;

/** Decorative art: the SVG is not a flattened image and never enters the accessibility tree. */
export function PolygonHeroArtwork() {
  return (
    <svg viewBox="0 0 980 690" className="kx-polygon-art kx-hero-art" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="kx-hero-face" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="hsl(var(--primary))" stopOpacity=".20" />
          <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity=".05" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity=".13" />
        </linearGradient>
        <linearGradient id="kx-hero-wave" x1="0" y1="0" x2=".3" y2="1">
          <stop stopColor="hsl(var(--primary))" stopOpacity=".18" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity=".025" />
        </linearGradient>
        <linearGradient id="kx-hero-route" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="hsl(var(--primary))" stopOpacity=".08" />
          <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity=".84" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity=".08" />
        </linearGradient>
        <radialGradient id="kx-hero-aura">
          <stop stopColor="hsl(var(--primary))" stopOpacity=".27" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
        <filter id="kx-hero-blur" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <g className="kx-hero-drift">
        <g className="kx-hero-wave">
          <path d="M-50 648 C165 542 290 570 440 631 S750 735 1020 600 L1020 690 L-50 690 Z"
            fill="url(#kx-hero-wave)" />
          <path d="M-35 615 C130 516 158 512 259 572 S502 673 690 648 S860 552 1020 574"
            fill="none" stroke="hsl(var(--primary))" strokeOpacity=".12" strokeWidth="1.4" />
          <path d="M45 608 C175 550 258 570 360 606 S616 710 790 665 S970 597 1040 609"
            fill="none" stroke="hsl(var(--background))" strokeOpacity=".8" strokeWidth="2.8" />
        </g>
        <g className="kx-hero-facets">
          {facets.map(([points, opacity], i) => (
            <polygon key={i} points={points} opacity={opacity} />
          ))}
        </g>
        <g className="kx-hero-lines" fill="none">
          {connections.map((d, i) => <path key={i} d={d} />)}
          <path className="kx-hero-arc" d="M350 300 C450 70 670 55 795 262" />
        </g>
        <g className="kx-hero-flow" fill="none">
          <path className="kx-hero-flow-blur" d={routes[0]} filter="url(#kx-hero-blur)" />
          <path className="kx-hero-flow-base" d={routes[0]} stroke="url(#kx-hero-route)" />
          <path className="kx-hero-flow-base kx-hero-flow-secondary" d={routes[1]} />
          <path className="kx-hero-flow-base kx-hero-flow-secondary" d={routes[2]} />
          {routes.map((d, i) => (
            <path key={i} className="kx-hero-trace" pathLength="1000" d={d} />
          ))}
        </g>
        <g className="kx-hero-glows">
          {([3, 6, 8, 11, 12, 17] as const).map((i) => (
            <circle key={i} cx={vertices[i][0]} cy={vertices[i][1]} r="30" fill="url(#kx-hero-aura)" />
          ))}
        </g>
        <g className="kx-hero-nodes">
          {vertices.map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={[3, 6, 8, 11, 12].includes(i) ? 5 : 3.5} />
          ))}
        </g>
      </g>
    </svg>
  );
}
