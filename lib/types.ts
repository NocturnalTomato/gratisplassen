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
}

export interface LocationWithStats extends Location {
  distanceMeters: number | null;
  stats: ReviewStats;
}

export interface Review {
  id: number;
  locationId: string;
  stars: number;
  cleanRating: number | null;
  toiletPaper: boolean;
  washHands: boolean;
  padsTampons: boolean;
  shower: boolean;
  paid: boolean | null;
  comment: string | null;
  createdAt: string;
}
