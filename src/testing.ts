import { ReplicaDatabase } from "./replica";
import { ReplicationManager } from "./replicationManager";

async function demonstrateReplication() {
    console.log('=== Database Replication Demo ===\n');

    // Create replication manager with 100ms replication delay
    const replicationManager = new ReplicationManager(100);

    // Add replicas
    replicationManager.addReplica(new ReplicaDatabase('replica-1'));
    replicationManager.addReplica(new ReplicaDatabase('replica-2', 0.1)); // 10% failure rate
    replicationManager.addReplica(new ReplicaDatabase('replica-3'));

    // Start health monitoring
    replicationManager.startHealthMonitoring(3000);

    // Create some users
    console.log('Creating users...');
    const user1 = await replicationManager.createUser({
        id: '1',
        name: 'Alice',
        email: 'alice@example.com',
    });
    console.log(`Created user: ${user1.name}`);

    const user2 = await replicationManager.createUser({
        id: '2',
        name: 'Bob',
        email: 'bob@example.com',
    });
    console.log(`Created user: ${user2.name}`);

    // replication
    console.log('\nWaiting for replication...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // READ from replicas
    console.log('\nReading from replicas...');
    const aliceFromReplica = await replicationManager.getUser('1', true);
    console.log(`Read Alice from replica: ${aliceFromReplica?.name}`);

    // Update user
    console.log('\nUpdating user...');
    await replicationManager.updateUser('1', { name: 'Alice Smith' });

    // replication
    await new Promise(resolve => setTimeout(resolve, 300));

    // consistency check
    await replicationManager.getDataConsistencyReport();

    // Delete user
    console.log('\nDeleting user...');
    await replicationManager.deleteUser('2');

    // Wait and consistency check again
    await new Promise(resolve => setTimeout(resolve, 300));
    await replicationManager.getDataConsistencyReport();

    // monitoring stop
    setTimeout(() => {
        replicationManager.stopHealthMonitoring();
        console.log('\nDemo completed!');
    }, 4000);
}

demonstrateReplication().catch(console.error);