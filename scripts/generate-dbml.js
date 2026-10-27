const fs = require('fs');
const path = require('path');
const { Prisma } = require('../server/node_modules/@prisma/client');
const { Parser } = require('../server/node_modules/@dbml/core');

const schemaPath = path.join(__dirname, '..', 'server', 'prisma', 'schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

const dmmf = Prisma.dmmf.datamodel;

// 1. Map Prisma types to DBML / PostgreSQL types
function mapType(field) {
  if (field.kind === 'enum') {
    return field.type;
  }
  switch (field.type) {
    case 'String':
      return 'varchar';
    case 'Int':
      return 'integer';
    case 'Float':
      return 'decimal';
    case 'Boolean':
      return 'boolean';
    case 'DateTime':
      return 'timestamp';
    case 'Json':
      return 'jsonb';
    default:
      return field.type.toLowerCase();
  }
}

// 2. Extract model-level @@index and @@unique from schema.prisma directly
function extractModelIndexes(modelName) {
  const modelRegex = new RegExp(`model\\s+${modelName}\\s*\\{([^}]+)\\}`, 'm');
  const match = schemaContent.match(modelRegex);
  if (!match) return { unique: [], indexes: [] };
  const body = match[1];
  
  const uniques = [];
  const indexes = [];

  const lines = body.split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    const uMatch = trimmed.match(/@@unique\(\[([^\]]+)\]\)/);
    if (uMatch) {
      uniques.push(uMatch[1].split(',').map(s => s.trim()));
    }
    const iMatch = trimmed.match(/@@index\(\[([^\]]+)\]\)/);
    if (iMatch) {
      indexes.push(iMatch[1].split(',').map(s => s.trim()));
    }
  });

  return { unique: uniques, indexes: indexes };
}

// Build DBML string
let dbml = `// ==============================================================================
// URBAN NEST — COMPLETE DATABASE ER DIAGRAM (DBML)
// Multi-Tenant PG & Property Management SaaS Platform
// Database Provider: PostgreSQL (Supabase Cluster)
// Generated from: server/prisma/schema.prisma
// Compatible with: DBdiagram.io and DBML v2 parsers
// ==============================================================================

Project urban_nest {
  database_type: 'PostgreSQL'
  Note: '''
    # Urban Nest Database Architecture
    Enterprise Multi-Tenant PG and Property Management SaaS
    - 27 Relational Entities
    - 29 Enums
    - 40 Foreign-Key Integrity Constraints
    - Strict Multi-Tenant Scoping and Cascading Deletes
  '''
}

// ------------------------------------------------------------------------------
// ENUMS (29 Enums)
// ------------------------------------------------------------------------------
`;

// Add Enums
dmmf.enums.forEach(en => {
  dbml += `\nEnum ${en.name} {\n`;
  en.values.forEach(v => {
    dbml += `  ${v.name}\n`;
  });
  dbml += `}\n`;
});

// Add Models
dbml += `\n// ------------------------------------------------------------------------------\n// TABLES (27 Models)\n// ------------------------------------------------------------------------------\n`;

const allRelations = [];

dmmf.models.forEach(model => {
  dbml += `\nTable ${model.name} {\n`;

  // Fields
  model.fields.forEach(field => {
    if (field.kind === 'object') {
      // Relation field, track relations for Ref definitions
      if (field.relationFromFields && field.relationFromFields.length > 0) {
        const fkField = field.relationFromFields[0];
        const targetModel = field.type;
        const targetField = field.relationToFields[0];
        const fkScalar = model.fields.find(f => f.name === fkField);
        const isOneToOne = fkScalar ? fkScalar.isUnique : false;
        
        let deleteRule = null;
        if (field.relationOnDelete) {
          const d = field.relationOnDelete.toLowerCase();
          if (d === 'setnull') deleteRule = 'set null';
          else if (d === 'noaction') deleteRule = 'no action';
          else if (d === 'setdefault') deleteRule = 'set default';
          else deleteRule = d;
        }

        allRelations.push({
          sourceModel: model.name,
          fkField,
          targetModel,
          targetField,
          isOneToOne,
          onDelete: deleteRule
        });
      }
      return; // Skip relation objects in column listing
    }

    const typeStr = mapType(field);
    const settings = [];

    if (field.isId) {
      settings.push('pk');
    }
    if (field.isUnique && !field.isId) {
      settings.push('unique');
    }
    if (field.isRequired) {
      settings.push('not null');
    }

    if (field.hasDefaultValue) {
      if (typeof field.default === 'object' && field.default !== null) {
        if (field.default.name === 'now') {
          settings.push("default: `now()`");
        } else if (field.default.name && field.default.name.startsWith('uuid')) {
          settings.push("note: 'UUID v4 generated'");
        }
      } else if (typeof field.default === 'string') {
        settings.push(`default: '${field.default}'`);
      } else if (typeof field.default === 'number' || typeof field.default === 'boolean') {
        settings.push(`default: ${field.default}`);
      }
    }

    const settingStr = settings.length > 0 ? ` [${settings.join(', ')}]` : '';
    dbml += `  ${field.name.padEnd(26)} ${typeStr.padEnd(18)}${settingStr}\n`;
  });

  // Indexes & composite unique constraints
  const { unique, indexes } = extractModelIndexes(model.name);
  if (unique.length > 0 || indexes.length > 0) {
    dbml += `\n  indexes {\n`;
    unique.forEach(uFields => {
      dbml += `    (${uFields.join(', ')}) [unique]\n`;
    });
    indexes.forEach(iFields => {
      dbml += `    (${iFields.join(', ')})\n`;
    });
    dbml += `  }\n`;
  }

  dbml += `}\n`;
});

// Add TableGroups for clean DBdiagram.io organization
dbml += `\n// ------------------------------------------------------------------------------
// LOGICAL MODULES / TABLEGROUPS (DBdiagram.io Grouping)
// ------------------------------------------------------------------------------

TableGroup saas_tenant_billing {
  Tenant
  Plan
}

TableGroup user_auth {
  User
}

TableGroup property_hierarchy {
  Property
  Building
  Floor
  Room
  Bed
}

TableGroup resident_lifecycle {
  Resident
  Agreement
  SecurityDeposit
  LeaveRequest
}

TableGroup finance_billing {
  Payment
  PaymentReceipt
  Expense
}

TableGroup visitor_gate_security {
  VisitorRequest
}

TableGroup maintenance_complaints {
  Complaint
  MaintenanceActivity
}

TableGroup documents_storage {
  Document
}

TableGroup communication_notices {
  Notice
  Notification
}

TableGroup safety_emergency {
  SOSEvent
}

TableGroup compliance_settings {
  AuditLog
  Setting
}

TableGroup operations_inventory {
  InventoryItem
  OperationalTask
}

TableGroup platform_support {
  SupportTicket
}
`;

// Add Foreign Key Ref statements
dbml += `\n// ------------------------------------------------------------------------------
// FOREIGN KEY RELATIONSHIPS (40 Explicit Foreign Keys)
// ------------------------------------------------------------------------------\n`;

allRelations.forEach((rel, idx) => {
  const operator = rel.isOneToOne ? '-' : '>';
  const deleteRule = rel.onDelete ? ` [delete: ${rel.onDelete}]` : '';
  dbml += `Ref: ${rel.sourceModel}.${rel.fkField} ${operator} ${rel.targetModel}.${rel.targetField}${deleteRule}\n`;
});

// Write DBML to destination
const outputPath = path.join(__dirname, '..', 'docs', 'database', 'urban_nest_er_diagram.dbml');
fs.writeFileSync(outputPath, dbml, 'utf8');

console.log(`Successfully generated DBML with ${dmmf.models.length} models, ${dmmf.enums.length} enums, and ${allRelations.length} relations at:`);
console.log(outputPath);

// Validate using @dbml/core
try {
  const parser = new Parser();
  const db = parser.parse(dbml, 'dbmlv2');
  console.log(`\n✅ DBML VALIDATION PASSED: ${db.schemas[0].tables.length} tables successfully verified by @dbml/core compiler.`);
} catch (err) {
  console.error('\n❌ DBML VALIDATION FAILED:', err);
  process.exit(1);
}
