 
export type ModeLivraison = 'standard' | 'rapide' | 'express';

export interface FraisLivraison {
  mode: ModeLivraison;
  label: string;
  icon: string;
  priceFcfa: number;
  delai: string;
  description: string;
}

export const MODES_LIVRAISON: FraisLivraison[] = [
  {
    mode: 'standard',
    label: 'Standard',
    icon: '⏱',
    priceFcfa: 600,
    delai: '45–90 min',
    description: 'Planifier pour plus tard',
  },
  {
    mode: 'rapide',
    label: 'Rapide',
    icon: '⚡',
    priceFcfa: 1000,
    delai: '20–45 min',
    description: 'Le plus populaire',
  },
  {
    mode: 'express',
    label: 'Express',
    icon: '🚀',
    priceFcfa: 1500,
    delai: '< 20 min',
    description: 'Tricycle dédié immédiat',
  },
];