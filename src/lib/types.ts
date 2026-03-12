export interface RoastSection {
  name: string;
  score: number;
  roast: string;
  tips: string[];
}

export interface RewrittenBullet {
  original: string;
  rewritten: string;
  why: string;
}

export interface RoastResult {
  id: string;
  overallScore: number;
  summary: string;
  sections: RoastSection[];
  atsScore: number;
  atsIssues: string[];
  rewrittenBullets: RewrittenBullet[];
  topIssues: string[];
  createdAt: string;
  tier?: "free" | "paid";
  paid?: boolean;
  email?: string;
  marketingOptIn?: boolean;
}

export interface RoastRequest {
  resumeText: string;
  tier: "free" | "paid";
}
