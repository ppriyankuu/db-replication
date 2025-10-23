# Database Replication
Simulates database replication logic - no actual databases, just the code patterns.

### What this is
A TypeScript implementation that mimics how production databases handle replication.
- write to primary database
- replicas sync data asynchronously
- eventual consistency in action

- *No external dependencies; pure typescript*

### What it does
- **Primary DB** : Handles all writes, maintains operation log
- **Replica DBs** : Asynchronous data sync from primary with (configurable) delay
- **Replication Manager**: Orchestrates the whole process
- **Health Monitoring**: Tracks replication lag and replica status
- **Consistency Checks**: Verifies data across primary and replicas

### What it has
- Primary database with write operations
- Multiple read replicas
- Replication manager with monitoring
- Demo showing the entire flow
- Failure simulation for testing

### Quick start
```
tsc -b
node dist/testing.js
```