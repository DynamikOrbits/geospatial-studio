/**
 * Geospatial Studio brand block for the top toolbar: the Dynamik "D" lettermark
 * (copied verbatim from the Dynamik design system, LogoIcon — currentColor-
 * driven), a hairline separator, and the product wordmark. Replaces the
 * upstream Map-icon + "GeoLibre" block in TopToolbar (a ledgered seam); this
 * file is ours.
 */
export function BrandMark({ showName }: { showName: boolean }) {
  return (
    <span className="me-1 flex shrink-0 items-center gap-2 md:me-2">
      <svg
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="h-5 w-5 shrink-0 text-foreground"
      >
        <path
          d="M163.383 59H54.359C52.527 59 51 60.527 51 62.36v131.011c0 1.833 1.527 3.36 3.36 3.36h109.023c.916 0 1.833-.306 2.443-.917l37.258-37.257c.611-.611.916-1.527.916-2.443V99.922c0-.916-.305-1.833-.916-2.443l-37.258-37.258C165.216 59.305 164.299 59 163.383 59Zm18.324 95.587c0 12.215-9.773 21.988-21.988 21.988H70.545V79.461h89.174c12.215 0 21.988 9.773 21.988 21.988v53.138Z"
          fill="currentColor"
        />
      </svg>
      {showName ? (
        <>
          <span className="hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden="true" />
          {/* The Constellation Studio wordmark voice: Inter, all caps, wide
              tracking. Sized down a step so the caps sit at the menu height. */}
          <span className="hidden whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.14em] text-foreground sm:inline">
            Geospatial Studio
          </span>
        </>
      ) : null}
    </span>
  );
}
