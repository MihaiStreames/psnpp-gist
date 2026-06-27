export type TGistRegistry = Record<string, string | null>; // "gistId:uuid" -> localListId | null (null = not yet created locally)
export type TSyncStatus = "syncing" | "synced" | "error";

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
  removeGames: "started" | "completed" | "platinum" | "never";
  removeStartedGames: boolean;
  note: string;
  url?: string;
  games: IGame[];
}

export interface IGistEntry {
  id: string;
  files: string[];
  readOnly?: boolean;
}

export interface IGistConfig {
  token: string;
  gists: IGistEntry[];
}

export type GistConfigState =
  | { status: "none" }
  | { status: "partial"; message: string }
  | { status: "ok"; config: IGistConfig };

export interface SyncState {
  config: IGistConfig | null;
  registry: TGistRegistry;
  cachedManifest: Record<string, Record<string, string>>;
  lastPulledAt: Record<string, string>;
  suppressSync: boolean;
  updateStatus: (status: TSyncStatus, detail?: string) => void;
}
