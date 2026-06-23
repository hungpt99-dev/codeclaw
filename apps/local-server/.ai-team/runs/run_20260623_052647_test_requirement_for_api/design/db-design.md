# Database Design

## Schema for: Test requirement for API

### Entity-Relationship Overview

### Tables

#### main_entity
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| status | VARCHAR(50) | NOT NULL | Current processing status |
| input_data | TEXT | NOT NULL | Original input payload |
| result_data | TEXT | | Processing result |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | Last update timestamp |

#### processing_log
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| entity_id | UUID | FOREIGN KEY → main_entity(id) | Reference to main entity |
| event | VARCHAR(100) | NOT NULL | Event type |
| details | TEXT | | Event details |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | Event timestamp |

### Indexes
| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| main_entity | idx_status | status | Filter by status |
| main_entity | idx_created_at | created_at | Time-based queries |
| processing_log | idx_entity_id | entity_id | Join with main entity |

### Migrations
- All schema changes must be versioned and reversible.
- Use timestamped migration files.
- Test migrations against a copy of production data before applying.

### Data Retention
- Processing logs: retained for 90 days.
- Main entities: retained indefinitely unless archiving policy applies.
