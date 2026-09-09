import { EventEmitter } from "node:events";

/**
 * Domain event bus.
 *
 * Services emit here and know nothing about transports; the realtime layer
 * subscribes and fans events out over WebSocket. When the agent layer arrives
 * it can subscribe to the same bus without touching any service.
 */

/** Routing hints — the realtime layer turns these into rooms. */
export interface EventScope {
  projectId?: string;
  taskId?: string;
}

export interface DomainEventPayloads {
  "task.created": EventScope & { task: unknown };
  "task.updated": EventScope & { task: unknown };
  "agent.started": EventScope & { agentRun: unknown };
  "agent.completed": EventScope & { agentRun: unknown };
  "negotiation.started": EventScope & { negotiation: unknown };
  "negotiation.completed": EventScope & { negotiation: unknown };
  "claim.created": EventScope & { claim: unknown };
  "evidence.added": EventScope & { evidence: unknown };
  "conflict.detected": EventScope & { conflict: unknown };
  "conflict.resolved": EventScope & { conflict: unknown };
  "decision.created": EventScope & { decision: unknown };
  "execution.started": EventScope & { execution: unknown };
  "execution.completed": EventScope & { execution: unknown };
  "verification.completed": EventScope & { verification: unknown };
}

export type DomainEventName = keyof DomainEventPayloads;

export interface DomainEvent<N extends DomainEventName = DomainEventName> {
  name: N;
  payload: DomainEventPayloads[N];
  emittedAt: string;
}

const bus = new EventEmitter({ captureRejections: true });

// Many sockets can listen to the same event; the default cap of 10 is too low.
bus.setMaxListeners(50);

const CHANNEL = "domain-event";

export function emitEvent<N extends DomainEventName>(
  name: N,
  payload: DomainEventPayloads[N]
): void {
  const event: DomainEvent<N> = {
    name,
    payload,
    emittedAt: new Date().toISOString()
  };

  bus.emit(CHANNEL, event);
}

export function onDomainEvent(
  listener: (event: DomainEvent) => void
): () => void {
  bus.on(CHANNEL, listener);

  return () => {
    bus.off(CHANNEL, listener);
  };
}
