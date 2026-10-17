/**
 * annotationSerialization.ts
 *
 * Converts between EmbedPDF's exported annotation items and the JSON string
 * stored via the mock persistence layer (`saveAnnotationsData` /
 * `getAnnotationsData`). Kept separate from the mock module so the mock stays
 * a pure string store that mirrors the real `{ annotations_data: string }`
 * contract.
 *
 * Rules (see ANNOTATION_FEATURE_CONTEXT.md § 4/5):
 *  - Only highlights that carry our own `custom.authorId` are persisted. This
 *    guarantees (a) a highlight with no comment is never saved, and (b)
 *    annotations that already live inside the source PDF (links, native
 *    highlights, etc.) are never exported and then re-imported as duplicates.
 *  - `created` / `modified` are `Date`s in memory and ISO strings in JSON, so
 *    they are revived to `Date` on parse before being handed to the engine.
 *  - Parsing never throws: corrupt / empty / wrongly-shaped data yields an
 *    empty list and a console warning, and never touches stored data.
 */

import type { AnnotationTransferItem } from "@embedpdf/plugin-annotation/react";
import { PdfAnnotationSubtype } from "@embedpdf/models";

/** True for a highlight that has been committed with a comment by our UI. */
export function isPersistableHighlight(item: AnnotationTransferItem): boolean {
  const a = item.annotation;
  return (
    a.type === PdfAnnotationSubtype.HIGHLIGHT &&
    typeof a.custom?.authorId === "string" &&
    a.custom.authorId.length > 0
  );
}

/** Filter to persistable highlights and stringify. */
export function serializeAnnotations(items: AnnotationTransferItem[]): string {
  // `ctx` is only populated for stamps, which we never persist, so only the
  // annotation object itself is stored.
  const payload = items
    .filter(isPersistableHighlight)
    .map((item) => ({ annotation: item.annotation }));
  return JSON.stringify(payload);
}

const reviveDate = (value: unknown): Date | undefined => {
  if (typeof value !== "string") return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/**
 * Parse stored JSON into importable items. Never throws.
 * Returns only well-formed persistable highlights.
 */
export function parseAnnotations(raw: string | null): AnnotationTransferItem[] {
  if (raw === null || raw.trim() === "") return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn(
      "[annotations] Stored annotation data is not valid JSON; ignoring it.",
      err,
    );
    return [];
  }

  if (!Array.isArray(parsed)) {
    console.warn(
      "[annotations] Stored annotation data is not an array; ignoring it.",
    );
    return [];
  }

  const items: AnnotationTransferItem[] = [];
  for (const entry of parsed) {
    const a = entry?.annotation;
    if (
      !a ||
      typeof a.id !== "string" ||
      typeof a.pageIndex !== "number" ||
      !a.rect
    ) {
      console.warn("[annotations] Skipping malformed stored annotation:", entry);
      continue;
    }
    const revived = { ...a };
    if (a.created !== undefined) revived.created = reviveDate(a.created);
    if (a.modified !== undefined) revived.modified = reviveDate(a.modified);
    const item: AnnotationTransferItem = { annotation: revived };
    if (isPersistableHighlight(item)) items.push(item);
  }
  return items;
}
