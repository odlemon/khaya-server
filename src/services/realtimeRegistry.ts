// @ts-nocheck
import type SocketService from "./SocketService";

let socketServiceInstance: SocketService | null = null;

export function setSocketService(instance: SocketService): void {
  socketServiceInstance = instance;
}

export function getSocketService(): SocketService | null {
  return socketServiceInstance;
}
