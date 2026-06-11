/* ==========================================================================
   Tag primitives — shared chip renderer + tag metadata helpers
   Built-in tags render via their CSS class (def.cls); custom tags render with
   an inline tint derived from def.color.
   ========================================================================== */

// Curated palette for custom tags (hex).
const TAG_PALETTE = [
  "#D97757", "#2A6FDB", "#1F8A5B", "#7A5AE0",
  "#C2410C", "#0E7490", "#BE185D", "#4D7C0F",
];

const TAG_BEHAVIORS = [
  { value: "cluster", label: "Cluster together", hint: "Groups people with this tag at the same table." },
  { value: "spread",  label: "Spread apart",     hint: "Places at most one per table when possible." },
  { value: "door",    label: "Seat near door",   hint: "Prefers tables closest to the entrance." },
  { value: "none",    label: "Informational",    hint: "No effect on auto-arrange." },
];

function tagBehaviorLabel(behavior) {
  const b = TAG_BEHAVIORS.find(x => x.value === behavior);
  return b ? b.label : "Informational";
}

// Append an alpha byte to a #rrggbb hex string (e.g. tagHexA('#abc123', '22')).
function tagHexA(hex, alpha) {
  if (typeof hex !== "string") return hex;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.replace(/./g, c => c + c);
  return "#" + h.slice(0, 6) + alpha;
}

// Tag chip. Pass the resolved tag definition object.
//   lg     — larger variant
//   short  — show only the first word of the label
//   count  — optional trailing count
function TagChip({ tag, lg, short, count }) {
  if (!tag) return null;
  const label = short ? String(tag.label).split(" ")[0] : tag.label;
  const isCustom = !tag.cls && !!tag.color;
  const className = "tag-chip" + (lg ? " lg" : "") + (tag.cls ? " " + tag.cls : isCustom ? " custom" : "");
  const style = isCustom
    ? { background: tagHexA(tag.color, "22"), color: tag.color, borderColor: tagHexA(tag.color, "55") }
    : undefined;
  return (
    <span className={className} style={style} title={tag.label}>
      {label}
      {count != null && (
        <span style={{ opacity: 0.65, fontFamily: "var(--ff-mono)", fontSize: 10, marginLeft: 4 }}>{count}</span>
      )}
    </span>
  );
}

window.TagChip = TagChip;
window.TAG_PALETTE = TAG_PALETTE;
window.TAG_BEHAVIORS = TAG_BEHAVIORS;
window.tagBehaviorLabel = tagBehaviorLabel;
