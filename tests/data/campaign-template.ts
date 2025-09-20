export interface CampaignPayload {
  name: string;
  description: string;
  max_conversations: number;
  evaluation_modes: string[];
  providers: string[];
  priority_settings: Record<string, unknown>;
  approval_required: boolean;
  tags: string[];
  parallel_conversations: number;
  conversations_per_campaign: number;
  max_parallelism: number;
  timeout_seconds: number;
  retry_failed: boolean;
  max_retries: number;
  safety_mode: string;
  content_filters: unknown[];
  pii_protection: boolean;
  initial_prompt: string;
  conversation_objectives: string[];
  required_topics: string[];
  min_turns: number;
  max_turns: number;
  turn_timeout_seconds: number;
  conversation_flow: Record<string, unknown>;
  success_criteria: Record<string, unknown>;
  auto_archive_days: number;
  notification_settings: Record<string, unknown>;
  config: Record<string, unknown>;
  priorities: unknown[];
}

const baseCampaignFields: Omit<CampaignPayload, 'name'> = {
  description: 'Automated test campaign created by Playwright',
  max_conversations: 1,
  evaluation_modes: ['standard'],
  providers: ['openai'],
  priority_settings: {},
  approval_required: false,
  tags: [],
  parallel_conversations: 1,
  conversations_per_campaign: 1,
  max_parallelism: 1,
  timeout_seconds: 30,
  retry_failed: true,
  max_retries: 1,
  safety_mode: 'standard',
  content_filters: [],
  pii_protection: true,
  initial_prompt: 'Hello from Playwright!',
  conversation_objectives: ['Validate campaign lifecycle'],
  required_topics: [],
  min_turns: 3,
  max_turns: 5,
  turn_timeout_seconds: 30,
  conversation_flow: {},
  success_criteria: {},
  auto_archive_days: 30,
  notification_settings: {},
  config: {},
  priorities: [],
};

export function buildCampaignPayload(): CampaignPayload {
  return {
    name: `Playwright API Campaign ${Date.now()}`,
    ...baseCampaignFields,
  };
}
