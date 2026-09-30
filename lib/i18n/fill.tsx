import type { ReactNode } from "react";

/**
 * Drops a node (usually a bold name) into a translated sentence at "{name}",
 * so the word order can differ between languages without splitting strings.
 */
export function fill(template: string, node: ReactNode): ReactNode {
  const [before, after = ""] = template.split("{name}");
  return (
    <>
      {before}
      {node}
      {after}
    </>
  );
}
