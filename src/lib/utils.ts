const addressAbbreviations: Record<string, string> = {
  st: "street",
  ave: "avenue",
  blvd: "boulevard",
  dr: "drive",
  rd: "road",
  ln: "lane",
  ct: "court",
  pl: "place",
  cir: "circle",
  hwy: "highway",
  pkwy: "parkway",
  sq: "square",
  ter: "terrace",
  trl: "trail",
  way: "way",
  apt: "apartment",
  ste: "suite",
  fl: "floor",
  bldg: "building",
};

export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => addressAbbreviations[word] || word)
    .join(" ");
}

export function generateRedfinUrl(address: string, city?: string, state?: string, zip?: string): string {
  const query = [address, city, state, zip].filter(Boolean).join(" ");
  return `https://www.redfin.com/search?searchType=address&q=${encodeURIComponent(query)}`;
}

export function generateMapsUrl(address: string, city?: string, state?: string, zip?: string): string {
  const query = [address, city, state, zip].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
