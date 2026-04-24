function elBadge(element) {
    return `<span class="el-badge ${element}">${element}</span>`;
}

function showSidebar(d) {
    document.getElementById('sidebar-field').innerHTML =
        d.field + `<span class="risk-badge ${d.risk}">${d.risk}</span>`;
    document.getElementById('sidebar-object').textContent = d.object;

    let html = '';
    if (d.writers.length) {
        html += `<div class="flow-section"><h3>Written by (${d.writers.length})</h3>`;
        for (const w of d.writers) {
            html += `<div class="flow-entry">${elBadge(w.element)}<span class="flow-name">${w.flow}</span></div>`;
        }
        html += '</div>';
    }
    if (d.readers.length) {
        html += `<div class="flow-section"><h3>Conditions on (${d.readers.length})</h3>`;
        for (const r of d.readers) {
            html += `<div class="flow-entry">${elBadge(r.element)}<span class="flow-name">${r.flow}</span></div>`;
        }
        html += '</div>';
    }
    document.getElementById('sidebar-content').innerHTML = html;
    document.getElementById('sidebar').classList.add('visible');
}

function initSidebar() {
    document.getElementById('close-sidebar').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('visible');
    });
}
