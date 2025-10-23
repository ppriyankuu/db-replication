import { EventEmitter } from 'events'
import { DatabaseOperation, ReplicationStatus, User } from './types';
import { ReplicaDatabase } from './replica';

export class PrimaryDatabase extends EventEmitter {
    private data: Map<string, User> = new Map();
    private operationLog: DatabaseOperation[] = [];
    private replicas: ReplicaDatabase[] = [];
    private replicationDelay: number;

    constructor(replicationDelay: number = 100) {
        super();
        this.replicationDelay = replicationDelay;
    }

    registerReplica(replica: ReplicaDatabase): void {
        this.replicas.push(replica);
        console.log(`Registered replica: ${replica.id}`);
    }

    // all the WRITE operations
    async createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
        const now = new Date();
        const newUser: User = {
            ...user,
            createdAt: now,
            updatedAt: now,
        };

        this.data.set(newUser.id, newUser);

        const operation: DatabaseOperation = {
            type: 'CREATE',
            table: 'users',
            data: newUser,
            timestamp: Date.now(),
        };

        this.operationLog.push(operation);
        this.emit('operation', operation);

        // async replication
        this.replicateToReplicas(operation);

        return newUser;
    }

    async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
        const existingUser = this.data.get(id);
        if (!existingUser) return null;

        const updatedUser: User = {
            ...existingUser,
            ...updates,
            updatedAt: new Date(),
        };

        this.data.set(id, updatedUser);

        const operation: DatabaseOperation = {
            type: 'UPDATE',
            table: 'users',
            data: updatedUser,
            timestamp: Date.now(),
        };

        this.operationLog.push(operation);
        this.emit('operation', operation);

        this.replicateToReplicas(operation);

        return updatedUser;
    }

    async deleteUser(id: string): Promise<boolean> {
        const user = this.data.get(id);
        if (!user) return false;

        this.data.delete(id);

        const operation: DatabaseOperation = {
            type: 'DELETE',
            table: 'users',
            data: { id },
            timestamp: Date.now(),
        };

        this.operationLog.push(operation);
        this.emit('operation', operation);

        this.replicateToReplicas(operation);

        return true;
    }

    // READ operations (primary is also capable of doing these; but are designated to the replicas)
    async getUser(id: string): Promise<User | null> {
        return this.data.get(id) || null;
    }

    async getAllUsers(): Promise<User[]> {
        return Array.from(this.data.values());
    }

    private async replicateToReplicas(operation: DatabaseOperation): Promise<void> {
        for (const replica of this.replicas) {
            setTimeout(() => {
                replica.applyOperation(operation).catch(error => {
                    console.error(`Falied to replicate to ${replica.id}: `, error.message);
                });
            }, this.replicationDelay + Math.random() * 25);
        }
    }

    getReplicationStatus(): Promise<ReplicationStatus[]> {
        const now = Date.now();
        return Promise.all(
            this.replicas.map(async replica => ({
                replicaId: replica.id,
                lastSyncedTimestamp: await replica.getLastSyncTimestamp(),
                lag: now - (await replica.getLastSyncTimestamp()),
                isHealthy: await replica.isHealthy(),
            }))
        );
    }
}
