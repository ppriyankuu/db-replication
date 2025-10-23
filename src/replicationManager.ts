import { PrimaryDatabase } from "./primaryDB";
import { ReplicaDatabase } from "./replica";
import { ReplicationStatus, User } from "./types";

export class ReplicationManager {
    private primary: PrimaryDatabase;
    private replicas: ReplicaDatabase[] = [];
    private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

    constructor(replicationDelay: number = 100) {
        this.primary = new PrimaryDatabase(replicationDelay);
    }

    addReplica(replica: ReplicaDatabase): void {
        this.replicas.push(replica);
        this.primary.registerReplica(replica);
    }

    // WRITE operations go to the primary
    async createUser(userData: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
        return this.primary.createUser(userData);
    }

    async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
        return this.primary.updateUser(id, updates);
    }

    async deleteUser(id: string): Promise<boolean> {
        return this.primary.deleteUser(id);
    }

    // READ ops; routed to the replicas to reduce load on primary
    async getUser(id: string, useReplica: boolean = true): Promise<User | null> {
        if (!useReplica || this.replicas.length === 0) {
            return this.primary.getUser(id);
        }

        // random selection of the replica (round-robin)
        const randomReplica = this.replicas[Math.floor(Math.random() * this.replicas.length)];

        return randomReplica.getUser(id);
    }

    async getAllUsers(useReplica: boolean = true): Promise<User[]> {
        if (!useReplica || this.replicas.length === 0) {
            return this.primary.getAllUsers();
        }

        const randomReplica = this.replicas[Math.floor(Math.random() * this.replicas.length)];
        return randomReplica.getAllUsers();
    }

    // monitoring
    async getReplicationStatus(): Promise<ReplicationStatus[]> {
        return this.primary.getReplicationStatus();
    }

    async getDataConsistencyReport(): Promise<void> {
        const primaryData = await this.primary.getAllUsers();

        console.log('\n=== Data Consistency Report ===');
        console.log(`Primary database has ${primaryData.length} records`);

        for (const replica of this.replicas) {
            const consistency = await replica.getDataConsistency(primaryData);
            console.log(`\nReplica ${replica.id}:`);
            console.log(`  Consistent: ${consistency.consistent}`);
            console.log(`  Missing records: ${consistency.missingRecords}`);
            console.log(`  Outdated records: ${consistency.outdatedRecords}`);
        }
    }

    // health monitoring
    startHealthMonitoring(intervalMilisecs: number = 5000): void {
        this.healthCheckInterval = setInterval(async () => {
            const status = await this.getReplicationStatus();
            console.log('\n=== Health Check ===');
            status.forEach(s => {
                console.log(`Replica ${s.replicaId}: ${s.isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (lag: ${s.lag}ms)`);
            });
        }, intervalMilisecs);
    }

    stopHealthMonitoring(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
}