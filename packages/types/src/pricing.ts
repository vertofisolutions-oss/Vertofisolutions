export enum SubscriptionTier {
  FREE = 'FREE',
  STARTER = 'STARTER',
  GROWTH = 'GROWTH',
  SCALE = 'SCALE',
  ENTERPRISE = 'ENTERPRISE',
}

export enum FeatureFlag {
  // Core
  BASIC_HEALTH_SCORE = 'BASIC_HEALTH_SCORE',
  FULL_HEALTH_SCORE = 'FULL_HEALTH_SCORE',
  WHATSAPP_ACCOUNTING = 'WHATSAPP_ACCOUNTING',
  
  // Growth & above
  PROFIT_LEAK_FINDER = 'PROFIT_LEAK_FINDER',
  PREDICTIVE_TAX_WARNING = 'PREDICTIVE_TAX_WARNING',
  ADVANCED_CASHFLOW_PREDICTOR = 'ADVANCED_CASHFLOW_PREDICTOR',
  FULL_AI_ADVISOR = 'FULL_AI_ADVISOR',
  SCENARIO_PLANNING = 'SCENARIO_PLANNING',
  VENDOR_RISK_INTELLIGENCE = 'VENDOR_RISK_INTELLIGENCE',
  
  // Scale & above
  MULTI_BUSINESS_INTELLIGENCE = 'MULTI_BUSINESS_INTELLIGENCE',
  COMBINED_GROUP_HEALTH_SCORE = 'COMBINED_GROUP_HEALTH_SCORE',
  EMERGENCY_TAX_ASSISTANCE = 'EMERGENCY_TAX_ASSISTANCE', // 24/7 SOS
}

export interface PricingPlanLimits {
  tier: SubscriptionTier;
  maxUsers: number;
  maxGstins: number;
  maxScannedBills: number;
  maxTransactions: number;
  features: FeatureFlag[];
}

export const PRICING_PLANS: Record<SubscriptionTier, PricingPlanLimits> = {
  [SubscriptionTier.FREE]: {
    tier: SubscriptionTier.FREE,
    maxUsers: 1,
    maxGstins: 1,
    maxScannedBills: 0,
    maxTransactions: 100,
    features: [FeatureFlag.BASIC_HEALTH_SCORE],
  },
  [SubscriptionTier.STARTER]: {
    tier: SubscriptionTier.STARTER,
    maxUsers: 2,
    maxGstins: 1,
    maxScannedBills: 50,
    maxTransactions: 500,
    features: [
      FeatureFlag.BASIC_HEALTH_SCORE,
      FeatureFlag.FULL_HEALTH_SCORE,
      FeatureFlag.WHATSAPP_ACCOUNTING,
    ],
  },
  [SubscriptionTier.GROWTH]: {
    tier: SubscriptionTier.GROWTH,
    maxUsers: 5,
    maxGstins: 3,
    maxScannedBills: 250,
    maxTransactions: 2000,
    features: [
      FeatureFlag.BASIC_HEALTH_SCORE,
      FeatureFlag.FULL_HEALTH_SCORE,
      FeatureFlag.WHATSAPP_ACCOUNTING,
      FeatureFlag.PROFIT_LEAK_FINDER,
      FeatureFlag.PREDICTIVE_TAX_WARNING,
      FeatureFlag.ADVANCED_CASHFLOW_PREDICTOR,
      FeatureFlag.FULL_AI_ADVISOR,
      FeatureFlag.SCENARIO_PLANNING,
      FeatureFlag.VENDOR_RISK_INTELLIGENCE,
    ],
  },
  [SubscriptionTier.SCALE]: {
    tier: SubscriptionTier.SCALE,
    maxUsers: 15,
    maxGstins: 10,
    maxScannedBills: 1000,
    maxTransactions: 10000,
    features: [
      FeatureFlag.BASIC_HEALTH_SCORE,
      FeatureFlag.FULL_HEALTH_SCORE,
      FeatureFlag.WHATSAPP_ACCOUNTING,
      FeatureFlag.PROFIT_LEAK_FINDER,
      FeatureFlag.PREDICTIVE_TAX_WARNING,
      FeatureFlag.ADVANCED_CASHFLOW_PREDICTOR,
      FeatureFlag.FULL_AI_ADVISOR,
      FeatureFlag.SCENARIO_PLANNING,
      FeatureFlag.VENDOR_RISK_INTELLIGENCE,
      FeatureFlag.MULTI_BUSINESS_INTELLIGENCE,
      FeatureFlag.COMBINED_GROUP_HEALTH_SCORE,
      FeatureFlag.EMERGENCY_TAX_ASSISTANCE,
    ],
  },
  [SubscriptionTier.ENTERPRISE]: {
    tier: SubscriptionTier.ENTERPRISE,
    maxUsers: 9999, // Unlimited
    maxGstins: 9999,
    maxScannedBills: 99999,
    maxTransactions: 999999,
    features: [
      FeatureFlag.BASIC_HEALTH_SCORE,
      FeatureFlag.FULL_HEALTH_SCORE,
      FeatureFlag.WHATSAPP_ACCOUNTING,
      FeatureFlag.PROFIT_LEAK_FINDER,
      FeatureFlag.PREDICTIVE_TAX_WARNING,
      FeatureFlag.ADVANCED_CASHFLOW_PREDICTOR,
      FeatureFlag.FULL_AI_ADVISOR,
      FeatureFlag.SCENARIO_PLANNING,
      FeatureFlag.VENDOR_RISK_INTELLIGENCE,
      FeatureFlag.MULTI_BUSINESS_INTELLIGENCE,
      FeatureFlag.COMBINED_GROUP_HEALTH_SCORE,
      FeatureFlag.EMERGENCY_TAX_ASSISTANCE,
    ],
  },
};
