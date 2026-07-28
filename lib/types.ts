export interface Location {
  id: string;
  name: string;
  type: string;
  address: string | null;
  lat: number;
  lon: number;
  paid: boolean | null;
  priceHint: string | null;
  wheelchair: boolean;
  source: string;
}

export interface ReviewStats {
  count: number;
  avgStars: number | null;
  toiletPaperPct: number | null;
  washHandsPct: number | null;
  padsTamponsPct: number | null;
  showerPct: number | null;
  paidVotes: { paid: number; free: number };
  noToiletCount: number;
  urinalOnlyCount: number;
  reportCount: number;
  /** true als 10+ meldingen binnen zijn en 70%+ daarvan "geen toilet" meldt — locatie wordt altijd verborgen. */
  hidden: boolean;
  /** true als 10+ meldingen binnen zijn en 70%+ daarvan "alleen urinoir" meldt — filterbaar, niet verborgen. */
  isUrinalOnly: boolean;
}

export interface LocationWithStats extends Location {
  distanceMeters: number | null;
  stats: ReviewStats;
}

export interface Review {
  id: number;
  locationId: string;
  stars: number | null;
  cleanRating: number | null;
  toiletPaper: boolean;
  washHands: boolean;
  padsTampons: boolean;
  shower: boolean;
  paid: boolean | null;
  noToilet: boolean;
  urinalOnly: boolean;
  comment: string | null;
  createdAt: string;
}
