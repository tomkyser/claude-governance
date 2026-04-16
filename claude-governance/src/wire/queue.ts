import { URGENCY_LEVELS, type Envelope } from './types';

export interface QueueConfig {
  backgroundQueueDepth?: number;
  activeQueueDepth?: number;
  directiveQueueDepth?: number;
}

export interface PriorityQueue {
  enqueue(envelope: Envelope): void;
  dequeue(): Envelope | null;
  peek(): Envelope | null;
  getDepth(): Record<string, number>;
  isEmpty(): boolean;
  flush(): Envelope[];
}

export function createPriorityQueue(
  config: QueueConfig = {},
): PriorityQueue {
  const queues: Record<string, Envelope[]> = {
    [URGENCY_LEVELS.URGENT]: [],
    [URGENCY_LEVELS.DIRECTIVE]: [],
    [URGENCY_LEVELS.ACTIVE]: [],
    [URGENCY_LEVELS.BACKGROUND]: [],
  };

  const limits: Record<string, number> = {
    [URGENCY_LEVELS.URGENT]: Infinity,
    [URGENCY_LEVELS.DIRECTIVE]: config.directiveQueueDepth || 100,
    [URGENCY_LEVELS.ACTIVE]: config.activeQueueDepth || 200,
    [URGENCY_LEVELS.BACKGROUND]: config.backgroundQueueDepth || 50,
  };

  const dequeueOrder: string[] = [
    URGENCY_LEVELS.URGENT,
    URGENCY_LEVELS.DIRECTIVE,
    URGENCY_LEVELS.ACTIVE,
    URGENCY_LEVELS.BACKGROUND,
  ];

  function enqueue(envelope: Envelope): void {
    const urgency = envelope.urgency || URGENCY_LEVELS.ACTIVE;
    const queue = queues[urgency];
    const limit = limits[urgency];

    if (queue.length >= limit) {
      queue.shift();
    }
    queue.push(envelope);
  }

  function dequeue(): Envelope | null {
    for (const level of dequeueOrder) {
      const queue = queues[level];
      if (queue.length > 0) {
        return queue.shift()!;
      }
    }
    return null;
  }

  function peek(): Envelope | null {
    for (const level of dequeueOrder) {
      const queue = queues[level];
      if (queue.length > 0) {
        return queue[0];
      }
    }
    return null;
  }

  function getDepth(): Record<string, number> {
    let total = 0;
    const depth: Record<string, number> = {};
    for (const level of dequeueOrder) {
      const count = queues[level].length;
      depth[level] = count;
      total += count;
    }
    depth.total = total;
    return depth;
  }

  function isEmpty(): boolean {
    return dequeueOrder.every((u) => queues[u].length === 0);
  }

  function flush(): Envelope[] {
    const result: Envelope[] = [];
    for (const level of dequeueOrder) {
      const queue = queues[level];
      if (queue.length > 0) {
        result.push(...queue.splice(0));
      }
    }
    return result;
  }

  return { enqueue, dequeue, peek, getDepth, isEmpty, flush };
}
