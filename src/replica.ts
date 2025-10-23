import { DatabaseOperation, User } from "./types";

export class ReplicaDatabase {
    public readonly id: string;
    private data: Map<string, User> = new Map();
    private lastSyncTimestamp: number = Date.now();
    private isReplicaHealthy: boolean = true;
    private failureRate: number = 0; // 0-1, indicating the percentage of failures

    constructor(id: string, failureRate: number = 0) {
        this.id = id;
        this.failureRate = failureRate;
    }

    // copying operations from the primary
    async applyOperation(operation: DatabaseOperation): Promise<void> {
        // simulating occasional failures
        if (Math.random() < this.failureRate) {
            throw new Error(`Replication failed for replica ${this.id}`);
        }

        try {
            switch (operation.type) {
                case 'CREATE':
                    this.data.set(operation.data.id, operation.data);
                    break;
                case 'UPDATE':
                    this.data.set(operation.data.id, operation.data);
                    break;
                case 'DELETE':
                    this.data.delete(operation.data.id);
                    break;
                default:
                    return;
            }
            this.lastSyncTimestamp = operation.timestamp;
        } catch (error) {
            console.error(`Error applying operation in replica ${this.id}:`, error);
            throw error;
        }
    }

    // all the READ operations
    async getUser(id: string): Promise<User | null> {
        return this.data.get(id) || null;
    }

    async getAllUsers(): Promise<User[]> {
        return Array.from(this.data.values());
    }

    async getLastSyncTimestamp(): Promise<number> {
        return this.lastSyncTimestamp;
    }

    async isHealthy(): Promise<boolean> {
        // random health issues
        return this.isReplicaHealthy && Math.random() > 0.1
    }

    // just for testing; munually setting the health
    setHealth(healthy: boolean): void {
        this.isReplicaHealthy = healthy;
    }

    // data consistency status in comparison to the primary
    async getDataConsistency(primaryData: User[]): Promise<
        {
            consistent: boolean,
            missingRecords: number;
            outdatedRecords: number;
        }> {

        let missingRecords = 0;
        let outdatedRecords = 0;

        for (const primaryUser of primaryData) {
            const replicaUser = this.data.get(primaryUser.id);
            if (!replicaUser) {
                missingRecords++;
            } else if (replicaUser.updatedAt < primaryUser.updatedAt) {
                outdatedRecords++;
            }
        }

        return {
            consistent: missingRecords === 0 && outdatedRecords === 0,
            missingRecords,
            outdatedRecords,
        };
    }
}