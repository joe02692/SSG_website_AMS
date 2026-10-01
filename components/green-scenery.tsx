import { Birds, Mountains, Pines, Tent } from "@/components/history/scenery";

/**
 * Outdoor "stickers" — mountains, pines, a tent, birds — drawn a shade
 * lighter than the forest green, behind the site's green bars. The same
 * shapes as the History page scenery, recoloured for a dark background.
 * Pure decoration: aria-hidden, and never in the way of a click.
 *
 * Mountains and pines are landscape, so they are not mirrored in Arabic;
 * they sit at both ends of the bar either way.
 */
const INK = "#2a5934";
const SNOW = "#3b7047";

/** Low, along the bottom of the 72px header. */
export function HeaderScenery() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <Mountains ink={INK} snow={SNOW} className="absolute -bottom-1 left-[-24px] w-[150px] sm:w-[190px]" />
      <Pines ink={INK} className="absolute -bottom-1 left-[22%] hidden w-[120px] opacity-80 md:block" />
      <Birds ink={SNOW} className="absolute left-[40%] top-2 hidden w-14 opacity-70 lg:block" />
      <Tent ink={INK} snow={SNOW} className="absolute -bottom-0.5 right-[30%] hidden w-[70px] lg:block" />
      <Mountains ink={INK} snow={SNOW} className="absolute -bottom-1 right-[-30px] w-[150px] -scale-x-100 sm:w-[200px]" />
    </div>
  );
}

/** Bigger, for the green page banners and the dashboard welcome band. */
export function BannerScenery() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <Mountains ink={INK} snow={SNOW} className="absolute -bottom-2 left-[-40px] w-[260px] sm:w-[360px]" />
      <Pines ink={INK} className="absolute -bottom-2 left-[24%] hidden w-[260px] md:block" />
      <Tent ink={INK} snow={SNOW} className="absolute bottom-0 left-[48%] hidden w-[120px] lg:block" />
      <Birds ink={SNOW} className="absolute right-[18%] top-5 w-24 opacity-80 sm:w-32" />
      <Pines ink={INK} className="absolute -bottom-2 right-[16%] hidden w-[220px] -scale-x-100 lg:block" />
      <Mountains ink={INK} snow={SNOW} className="absolute -bottom-2 right-[-50px] w-[240px] -scale-x-100 sm:w-[340px]" />
    </div>
  );
}
