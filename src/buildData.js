function riskLevel(writers, readers) {
    const hasRecordUpdate = writers.some(w => w.element === 'recordUpdate');
    const hasAssignment = writers.some(w => w.element === 'assignment');
    const hasStartRead = readers.some(r => r.element === 'start');
    const hasDecisionRead = readers.some(r => r.element === 'decision');

    if (hasRecordUpdate && hasStartRead) return 'critical';   // after-save DML re-triggers flows
    if (hasAssignment && hasStartRead) return 'high';          // before-save sets field another flow conditions on
    if ((hasRecordUpdate || hasAssignment) && hasDecisionRead) return 'medium'; // behavioral impact
    if (writers.length > 0 && readers.length > 0) return 'medium';
    if (writers.length > 0) return 'write';
    return 'read';
}

function buildFieldData(flows) {
    const fields = {};

    const touch = (fieldName, objectName, flowName, element, role) => {
        const key = `${objectName}.${fieldName}`;
        if (!fields[key]) fields[key] = { field: fieldName, object: objectName, readers: [], writers: [] };
        const entry = { flow: flowName, element };
        const list = role === 'read' ? fields[key].readers : fields[key].writers;
        if (!list.some(e => e.flow === flowName && e.element === element)) list.push(entry);
    };

    for (const flow of flows) {
        if (!flow.object) continue;
        for (const r of flow.reads) touch(r.field, flow.object, flow.name, r.element, 'read');
        for (const w of flow.writes) touch(w.field, w.object || flow.object, flow.name, w.element, 'write');
    }

    return Object.values(fields).map(f => ({
        ...f,
        readerCount: f.readers.length,
        writerCount: f.writers.length,
        risk: riskLevel(f.writers, f.readers),
        size: f.readers.length + f.writers.length,
    }));
}

module.exports = { buildFieldData };
