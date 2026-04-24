const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (name) => [
        'filters', 'inputAssignments', 'recordUpdates', 'recordCreates', 'assignments', 'assignmentItems',
        'conditions', 'decisions', 'rules', 'recordLookups', 'variables'
    ].includes(name)
});

function findFlowFiles(repoPath) {
    const results = [];
    const search = (dir) => {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) search(path.join(dir, entry.name));
            else if (entry.name.endsWith('.flow-meta.xml')) results.push(path.join(dir, entry.name));
        }
    };
    search(repoPath);
    return results;
}

function splitRef(ref) {
    const match = ref && ref.match(/^([\w$]+)\.([\w]+)$/);
    return match ? { varName: match[1], field: match[2] } : null;
}

function extractReads(flow, start) {
    const reads = [];

    for (const f of start.filters || []) {
        if (f.field) reads.push({ field: f.field, element: 'start' });
    }

    if (start.filterFormula) {
        for (const m of start.filterFormula.matchAll(/\{\s*!\s*\$Record(?:__Prior)?\.(\w+)\s*\}/g)) {
            reads.push({ field: m[1], element: 'start' });
        }
    }

    for (const c of start.conditions || []) {
        const parts = splitRef(c.leftValueReference);
        if (parts) reads.push({ field: parts.field, element: 'start' });
    }

    for (const decision of flow.decisions || []) {
        for (const rule of decision.rules || []) {
            for (const c of rule.conditions || []) {
                const parts = splitRef(c.leftValueReference);
                if (parts) reads.push({ field: parts.field, element: 'decision' });
            }
        }
    }

    return reads;
}

function buildVarObjectMap(flow) {
    const map = {};
    for (const lookup of flow.recordLookups || []) {
        if (lookup.name && lookup.object) map[lookup.name] = lookup.object;
    }
    for (const v of flow.variables || []) {
        if (v.name && v.dataType === 'SObject' && v.objectType) map[v.name] = v.objectType;
    }
    return map;
}

function buildStagedFieldsMap(flow) {
    // var -> Set of fields staged via assignments (after-save pattern)
    const map = {};
    for (const assignment of flow.assignments || []) {
        for (const item of assignment.assignmentItems || []) {
            const parts = splitRef(item.assignToReference || '');
            if (parts && parts.varName !== '$Record') {
                if (!map[parts.varName]) map[parts.varName] = new Set();
                map[parts.varName].add(parts.field);
            }
        }
    }
    return map;
}

function extractWrites(flow, start, triggerType) {
    const writes = [];
    const triggerObject = start.object;

    // Before-save: $Record.Field assignments are direct writes
    if (triggerType === 'RecordBeforeSave') {
        for (const assignment of flow.assignments || []) {
            for (const item of assignment.assignmentItems || []) {
                const parts = splitRef(item.assignToReference || '');
                if (parts && parts.varName === '$Record') {
                    writes.push({ field: parts.field, object: triggerObject, element: 'assignment' });
                }
            }
        }
    }

    const varObjectMap = buildVarObjectMap(flow);
    const stagedFieldsMap = buildStagedFieldsMap(flow);

    for (const update of flow.recordUpdates || []) {
        const ref = update.inputReference || '';
        const isCurrentRecord = ref === '$Record';
        const object = isCurrentRecord ? triggerObject : (varObjectMap[ref] || update.object || triggerObject);

        if (update.inputAssignments && update.inputAssignments.length > 0) {
            for (const a of update.inputAssignments || []) {
                if (a.field) writes.push({ field: a.field, object, element: 'recordUpdate' });
            }
        } else if (!isCurrentRecord && stagedFieldsMap[ref]) {
            for (const field of stagedFieldsMap[ref]) {
                writes.push({ field, object, element: 'recordUpdate' });
            }
        }
    }

    for (const create of flow.recordCreates || []) {
        // Pattern 1: inline inputAssignments with explicit object
        if (create.object && create.inputAssignments && create.inputAssignments.length > 0) {
            for (const a of create.inputAssignments) {
                if (a.field) writes.push({ field: a.field, object: create.object, element: 'recordCreate' });
            }
            continue;
        }

        // Pattern 2: inputReference to a variable/collection — fields staged via assignments
        if (create.inputReference) {
            const object = varObjectMap[create.inputReference];
            if (!object) continue;
            // Collect staged fields from any variable of the same object type
            for (const [varName, fields] of Object.entries(stagedFieldsMap)) {
                if (varObjectMap[varName] === object) {
                    for (const field of fields) {
                        writes.push({ field, object, element: 'recordCreate' });
                    }
                }
            }
        }
    }

    return writes;
}

function parseScreenFlow(filePath, flow) {
    const varObjectMap = buildVarObjectMap(flow);
    const stagedFieldsMap = buildStagedFieldsMap(flow);
    const writes = [];

    for (const update of flow.recordUpdates || []) {
        const ref = update.inputReference || '';
        const object = varObjectMap[ref] || update.object;
        if (!object) continue;

        if (update.inputAssignments && update.inputAssignments.length > 0) {
            for (const a of update.inputAssignments) {
                if (a.field) writes.push({ field: a.field, object, element: 'screen' });
            }
        } else if (stagedFieldsMap[ref]) {
            for (const field of stagedFieldsMap[ref]) {
                writes.push({ field, object, element: 'screen' });
            }
        }
    }

    for (const create of flow.recordCreates || []) {
        if (create.object && create.inputAssignments && create.inputAssignments.length > 0) {
            for (const a of create.inputAssignments) {
                if (a.field) writes.push({ field: a.field, object: create.object, element: 'recordCreate' });
            }
            continue;
        }
        if (create.inputReference) {
            const object = varObjectMap[create.inputReference];
            if (!object) continue;
            for (const [varName, fields] of Object.entries(stagedFieldsMap)) {
                if (varObjectMap[varName] === object) {
                    for (const field of fields) {
                        writes.push({ field, object, element: 'recordCreate' });
                    }
                }
            }
        }
    }

    if (!writes.length) return null;

    const objects = [...new Set(writes.map(w => w.object))];

    return {
        name: path.basename(filePath, '.flow-meta.xml'),
        object: objects[0],
        triggerType: 'Screen',
        recordTriggerType: null,
        status: flow.status || 'Unknown',
        reads: [],
        writes,
    };
}

function parseFlow(filePath) {
    const xml = fs.readFileSync(filePath, 'utf8');
    const doc = parser.parse(xml);
    const flow = doc.Flow;
    if (!flow) return null;

    const start = flow.start;
    if (!start) return null;

    const triggerType = start.triggerType;

    if (!triggerType || !triggerType.startsWith('Record')) {
        return flow.processType === 'Flow' ? parseScreenFlow(filePath, flow) : null;
    }

    return {
        name: path.basename(filePath, '.flow-meta.xml'),
        object: start.object || null,
        triggerType,
        recordTriggerType: start.recordTriggerType || null,
        status: flow.status || 'Unknown',
        reads: extractReads(flow, start),
        writes: extractWrites(flow, start, triggerType),
    };
}

function parseFlows(repoPath) {
    return findFlowFiles(repoPath)
        .map(parseFlow)
        .filter(Boolean);
}

module.exports = { parseFlows };
