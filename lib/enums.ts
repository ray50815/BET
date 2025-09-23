export const MARKET_TYPE = {
  ML: 'ML',
  SPREAD: 'SPREAD',
  TOTAL: 'TOTAL'
} as const;

export type MarketTypeKey = keyof typeof MARKET_TYPE;
export type MarketType = (typeof MARKET_TYPE)[MarketTypeKey];
export const MARKET_TYPE_VALUES = Object.values(MARKET_TYPE) as readonly MarketType[];
export const MARKET_TYPE_KEYS = Object.keys(MARKET_TYPE) as MarketTypeKey[];

export const MARKET_SELECTION = {
  HOME: 'HOME',
  AWAY: 'AWAY',
  OVER: 'OVER',
  UNDER: 'UNDER'
} as const;

export type MarketSelectionKey = keyof typeof MARKET_SELECTION;
export type MarketSelection = (typeof MARKET_SELECTION)[MarketSelectionKey];
export const MARKET_SELECTION_VALUES = Object.values(MARKET_SELECTION) as readonly MarketSelection[];
export const MARKET_SELECTION_KEYS = Object.keys(MARKET_SELECTION) as MarketSelectionKey[];

export const PICK_SELECTION = MARKET_SELECTION;
export type PickSelectionKey = MarketSelectionKey;
export type PickSelection = MarketSelection;
export const PICK_SELECTION_VALUES = MARKET_SELECTION_VALUES;

export const RESULT_OUTCOME = {
  WIN: 'WIN',
  LOSE: 'LOSE',
  PUSH: 'PUSH'
} as const;

export type ResultOutcomeKey = keyof typeof RESULT_OUTCOME;
export type ResultOutcome = (typeof RESULT_OUTCOME)[ResultOutcomeKey];
export const RESULT_OUTCOME_VALUES = Object.values(RESULT_OUTCOME) as readonly ResultOutcome[];
export const RESULT_OUTCOME_KEYS = Object.keys(RESULT_OUTCOME) as ResultOutcomeKey[];

export function isMarketTypeValue(value: string): value is MarketType {
  return MARKET_TYPE_VALUES.includes(value as MarketType);
}

export function parseMarketTypeInput(value: string): MarketType {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'MONEYLINE') return MARKET_TYPE.ML;
  if (normalized === 'OU' || normalized === 'O/U') return MARKET_TYPE.TOTAL;
  if (isMarketTypeValue(normalized)) return normalized as MarketType;
  throw new Error(`未知的盤口類型: ${value}`);
}

export function parseMarketSelectionInput(value: string): MarketSelection {
  const normalized = value.trim().toUpperCase();
  switch (normalized) {
    case 'HOME':
    case 'H':
      return MARKET_SELECTION.HOME;
    case 'AWAY':
    case 'A':
      return MARKET_SELECTION.AWAY;
    case 'OVER':
    case 'O':
      return MARKET_SELECTION.OVER;
    case 'UNDER':
    case 'U':
      return MARKET_SELECTION.UNDER;
    default:
      throw new Error(`未知的投注選項: ${value}`);
  }
}

export function parseResultOutcomeInput(value: string): ResultOutcome {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'W' || normalized === 'WIN') return RESULT_OUTCOME.WIN;
  if (normalized === 'L' || normalized === 'LOSE') return RESULT_OUTCOME.LOSE;
  if (normalized === 'P' || normalized === 'PUSH') return RESULT_OUTCOME.PUSH;
  throw new Error(`未知的賽果標記: ${value}`);
}

export function formatMarketTypeLabel(value: MarketType) {
  switch (value) {
    case MARKET_TYPE.ML:
      return '獨贏';
    case MARKET_TYPE.SPREAD:
      return '讓分';
    case MARKET_TYPE.TOTAL:
      return '大小分';
    default:
      return value;
  }
}
