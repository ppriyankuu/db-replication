
export interface User {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DatabaseOperation {
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    table: string;
    data: any;
    timestamp: number;
}

export interface ReplicationStatus {
    replicaId: string;
    lastSyncedTimestamp: number;
    lag: number; // for eventual consistency; in miliseconds 
    isHealthy: boolean
}