import type { FullConfig, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { randomUUID, createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

interface AllureLabel {
  name: string;
  value: string;
}

interface AllureAttachment {
  name: string;
  type?: string;
  source: string;
}

interface AllureStatusDetails {
  message?: string;
  trace?: string;
}

interface AllureTime {
  start: number;
  stop: number;
  duration: number;
}

interface AllureResultPayload {
  uuid: string;
  name: string;
  fullName: string;
  historyId: string;
  testCaseId: string;
  status: 'passed' | 'failed' | 'broken' | 'skipped' | 'unknown';
  statusDetails: AllureStatusDetails;
  stage: 'finished';
  steps: unknown[];
  attachments: AllureAttachment[];
  parameters: { name: string; value: string }[];
  labels: AllureLabel[];
  links: unknown[];
  time: AllureTime;
}

interface AllureContainerPayload {
  uuid: string;
  name: string;
  children: string[];
  befores: unknown[];
  afters: unknown[];
  links: unknown[];
  start: number;
  stop: number;
}

interface RunningTestInfo {
  uuid: string;
  containerUuid: string;
  start: number;
}

const { version: playwrightVersion } = require('@playwright/test/package.json');

class SimpleAllureReporter implements Reporter {
  private resultsDir!: string;
  private tests = new Map<TestResult, RunningTestInfo>();

  onBegin(config: FullConfig, suite: Suite) {
    const configured = process.env.ALLURE_RESULTS_DIR;
    const dir = configured ? path.resolve(configured) : path.resolve(process.cwd(), 'allure-results');
    this.resultsDir = dir;
    fs.rmSync(this.resultsDir, { force: true, recursive: true });
    fs.mkdirSync(this.resultsDir, { recursive: true });
    this.writeExecutorInfo(config, suite);
  }

  onTestBegin(test: TestCase, result: TestResult) {
    const start = result.startTime?.getTime?.() ?? Date.now();
    this.tests.set(result, {
      uuid: randomUUID(),
      containerUuid: randomUUID(),
      start,
    });
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const meta = this.tests.get(result);
    if (!meta) {
      return;
    }

    const stop = meta.start + (result.duration ?? 0);
    const labels = this.buildLabels(test, result);
    const fullName = this.buildFullName(test);
    const historyId = this.hash(fullName);
    const testLocation = this.describeLocation(test);
    const testCaseId = this.hash(testLocation);

    const attachments = this.collectAttachments(result, meta.uuid);
    const payload: AllureResultPayload = {
      uuid: meta.uuid,
      name: test.title,
      fullName,
      historyId,
      testCaseId,
      status: this.mapStatus(result.status, result.error),
      statusDetails: {
        message: result.error?.message,
        trace: result.error?.stack,
      },
      stage: 'finished',
      steps: [],
      attachments,
      parameters: this.buildParameters(result),
      labels,
      links: [],
      time: {
        start: meta.start,
        stop,
        duration: Math.max(0, stop - meta.start),
      },
    };

    this.writeJson(`${meta.uuid}-result.json`, payload);

    const container: AllureContainerPayload = {
      uuid: meta.containerUuid,
      name: this.computeContainerName(test),
      children: [meta.uuid],
      befores: [],
      afters: [],
      links: [],
      start: meta.start,
      stop,
    };

    this.writeJson(`${meta.containerUuid}-container.json`, container);
    this.tests.delete(result);
  }

  private buildParameters(result: TestResult) {
    const parameters: { name: string; value: string }[] = [];
    if (result.projectName) {
      parameters.push({ name: 'Project', value: result.projectName });
    }
    if (typeof result.retry === 'number') {
      parameters.push({ name: 'Retry', value: String(result.retry) });
    }
    return parameters;
  }

  private describeLocation(test: TestCase) {
    const { file, line, column } = test.location ?? {};
    return [test.id, file, line, column].filter((part) => part !== undefined).join(':');
  }

  private buildLabels(test: TestCase, result: TestResult): AllureLabel[] {
    const titles = test.titlePath();
    const parentSuites = titles.slice(1, -1);
    const labels: AllureLabel[] = [
      { name: 'language', value: 'TypeScript' },
      { name: 'framework', value: 'Playwright' },
      { name: 'package', value: test.location?.file ?? '' },
    ];

    if (parentSuites.length > 0) {
      labels.push({ name: 'parentSuite', value: parentSuites[0] });
      if (parentSuites.length > 1) {
        labels.push({ name: 'suite', value: parentSuites.slice(1).join(' > ') });
      }
    }
    if (result.projectName) {
      labels.push({ name: 'thread', value: result.projectName });
    }
    labels.push({ name: 'host', value: process.env.HOSTNAME ?? 'localhost' });
    labels.push({ name: 'frameworkVersion', value: playwrightVersion });
    return labels;
  }

  private buildFullName(test: TestCase) {
    return test.titlePath().join(' › ');
  }

  private computeContainerName(test: TestCase) {
    const titles = test.titlePath();
    return titles.slice(0, -1).join(' › ') || 'Global';
  }

  private collectAttachments(result: TestResult, baseUuid: string): AllureAttachment[] {
    const attachments: AllureAttachment[] = [];
    for (const [index, attachment] of result.attachments.entries()) {
      if (!attachment.path && !attachment.body) {
        continue;
      }
      const extension = this.extensionForContentType(attachment.contentType) ?? path.extname(attachment.path ?? '') ?? '';
      const fileName = `${baseUuid}-attachment-${index}${extension}`;
      const destination = path.join(this.resultsDir, fileName);
      try {
        if (attachment.path) {
          fs.copyFileSync(attachment.path, destination);
        } else if (attachment.body) {
          const buffer = typeof attachment.body === 'string' ? Buffer.from(attachment.body) : attachment.body;
          fs.writeFileSync(destination, buffer);
        }
        attachments.push({ name: attachment.name, type: attachment.contentType, source: fileName });
      } catch (error) {
        console.warn(`Failed to persist Allure attachment ${attachment.name}:`, error);
      }
    }
    return attachments;
  }

  private extensionForContentType(contentType?: string | null): string | undefined {
    if (!contentType) {
      return undefined;
    }
    if (contentType.includes('png')) {
      return '.png';
    }
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      return '.jpg';
    }
    if (contentType.includes('zip')) {
      return '.zip';
    }
    if (contentType.includes('json')) {
      return '.json';
    }
    if (contentType.includes('plain')) {
      return '.txt';
    }
    return undefined;
  }

  private mapStatus(status: TestResult['status'], error?: TestResult['error']): AllureResultPayload['status'] {
    switch (status) {
      case 'passed':
        return 'passed';
      case 'skipped':
        return 'skipped';
      case 'failed':
        return 'failed';
      case 'timedOut':
        return 'broken';
      case 'interrupted':
        return 'broken';
      default:
        return error ? 'failed' : 'unknown';
    }
  }

  private writeExecutorInfo(config: FullConfig, suite: Suite) {
    const executor = {
      name: 'Playwright',
      type: 'playwright',
      url: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
        : undefined,
      buildOrder: process.env.GITHUB_RUN_NUMBER,
      buildName: process.env.GITHUB_WORKFLOW,
      buildUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : undefined,
      reportName: 'Playwright Test Run',
    };
    this.writeJson('executor.json', executor);
  }

  private hash(value: string): string {
    return createHash('md5').update(value).digest('hex');
  }

  private writeJson(fileName: string, data: unknown) {
    const filePath = path.join(this.resultsDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
}

export default SimpleAllureReporter;
