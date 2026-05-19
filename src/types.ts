export interface IGame {
  id: string;
  scrapetime: number;
  title: string;
  image: string;
  url: string;
  points: number;
  platforms: {
    ps5: boolean;
    ps4: boolean;
    ps3: boolean;
    psvita: boolean;
    psvr: boolean;
    pc: boolean;
  };
  trophies: {
    platinum: number;
    gold: number;
    silver: number;
    bronze: number;
  };
  region?: string;
  dlccount: number;
  platinumpct?: number;
  completepct?: number;
  timestamp: number;
  psplus: boolean;
  tags: string[];
  note: string;
}

export interface IList {
  id: string;
  name: string;
  timestamp: number;
  tags: string[];
  orderBy: string;
  direction: string;
  removeGames: 'started' | 'completed' | 'platinum' | 'never';
  removeStartedGames: boolean;
  note: string;
  url?: string;
  games: IGame[];
}
