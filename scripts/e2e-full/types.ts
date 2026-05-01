export type ServiceType = 'tarot' | 'saju' | 'shinjeom';

export interface InputValues {
  name?: string;
  birthDate: string;
  gender: 'male' | 'female';
  birthHour?: string;
  timeRange?: string;
  message?: string;
}

export interface TestCase {
  id: string;
  service: ServiceType;
  characterId: string;
  topic: string;
  spreadType?: string;
  inputValues: InputValues;
}

export interface ValidationResult {
  passed: boolean;
  warning?: boolean;
  score: number;
  checks: Record<string, boolean>;
  reason: string;
}

export interface TestResult {
  testCase: TestCase;
  flowPassed: boolean;
  responseText: string;
  structureValidation: ValidationResult;
  contentValidation: ValidationResult;
  passed: boolean;
  warning: boolean;
  durationMs: number;
  error?: string;
}

export interface WorkerReport {
  workerId: number;
  results: TestResult[];
  startedAt: string;
  completedAt: string;
}
