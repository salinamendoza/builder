export interface PricingConfig {
  mediumRates: Record<string, number>;
  complexityWeights: Record<string, number>;
  culturalWeights: Record<string, number>;
  exhibitionWeights: Record<string, number>;
  careerMultiplier: number;
  minimumPrice: number;
}

export const DEFAULT_MEDIUMS = [
  'Acrylic on canvas',
  'Oil on canvas',
  'Mixed media',
  'Watercolor',
  'Digital print',
  'Original print',
  'Ink on paper',
  'Spray paint on canvas',
];

export const DEFAULT_CONFIG: PricingConfig = {
  mediumRates: {
    'Acrylic on canvas': 2.5,
    'Oil on canvas': 3.5,
    'Mixed media': 3.0,
    'Watercolor': 2.0,
    'Digital print': 0.75,
    'Original print': 1.5,
    'Ink on paper': 1.75,
    'Spray paint on canvas': 2.75,
  },
  complexityWeights: {
    low: 0.8,
    standard: 1.0,
    high: 1.3,
    exceptional: 1.6,
  },
  culturalWeights: {
    standard: 1.0,
    significant: 1.25,
    central: 1.5,
  },
  exhibitionWeights: {
    none: 1.0,
    group: 1.15,
    solo: 1.3,
    museum: 1.5,
  },
  careerMultiplier: 1.0,
  minimumPrice: 150,
};

const STORAGE_KEY = 'art-agent-pricing-config';

export function loadPricingConfig(): PricingConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export function savePricingConfig(config: PricingConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export interface PricingInput {
  widthInches: number;
  heightInches: number;
  medium: string;
  complexity: string;
  culturalSignificance: string;
  exhibitionContext: string;
}

export interface PricingResult {
  suggestedPrice: number;
  squareInches: number;
  mediumRate: number;
  basePrice: number;
  complexityMultiplier: number;
  culturalMultiplier: number;
  exhibitionMultiplier: number;
  careerMultiplier: number;
  breakdown: string;
}

export function calculatePrice(
  config: PricingConfig,
  input: PricingInput,
): PricingResult {
  const squareInches = input.widthInches * input.heightInches;
  const mediumRate = config.mediumRates[input.medium] ?? 2.5;
  const basePrice = squareInches * mediumRate;

  const complexityMultiplier = config.complexityWeights[input.complexity] ?? 1.0;
  const culturalMultiplier = config.culturalWeights[input.culturalSignificance] ?? 1.0;
  const exhibitionMultiplier = config.exhibitionWeights[input.exhibitionContext] ?? 1.0;

  const raw =
    basePrice *
    complexityMultiplier *
    culturalMultiplier *
    exhibitionMultiplier *
    config.careerMultiplier;

  const suggestedPrice = Math.max(
    config.minimumPrice,
    Math.round(raw / 5) * 5, // round to nearest $5
  );

  const breakdown = [
    `${squareInches} sq in x $${mediumRate.toFixed(2)}/sq in = $${basePrice.toFixed(0)} base`,
    complexityMultiplier !== 1.0 ? `x ${complexityMultiplier} complexity` : '',
    culturalMultiplier !== 1.0 ? `x ${culturalMultiplier} cultural significance` : '',
    exhibitionMultiplier !== 1.0 ? `x ${exhibitionMultiplier} exhibition context` : '',
    config.careerMultiplier !== 1.0
      ? `x ${config.careerMultiplier} career multiplier`
      : '',
  ]
    .filter(Boolean)
    .join(' \u2192 ');

  return {
    suggestedPrice,
    squareInches,
    mediumRate,
    basePrice,
    complexityMultiplier,
    culturalMultiplier,
    exhibitionMultiplier,
    careerMultiplier: config.careerMultiplier,
    breakdown,
  };
}

export function parseDimensions(input: string): { w: number; h: number } | null {
  // Match patterns like "36x48", "36 x 48", '36" x 48"', "36in x 48in"
  const match = input.match(
    /(\d+(?:\.\d+)?)\s*(?:"|in|inches?)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:"|in|inches?)?/i,
  );
  if (!match) return null;
  return { w: parseFloat(match[1]), h: parseFloat(match[2]) };
}
