// Drawn separator between two short facts ("Str. S | God"). Screen readers
// still hear the middle dot the text used before.
export function Sep() {
  return (
    <>
      <span aria-hidden className="mx-[7px] inline-block h-[11px] w-px bg-[#B3AFA2] align-[-1px]" />
      <span className="sr-only"> · </span>
    </>
  );
}
