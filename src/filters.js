let activeRisk = 'all';
let activeElement = 'all';
let activeObject = '';
let fieldSearch = '';

function filtered() {
    return DATA.filter(d => {
        if (activeRisk !== 'all' && d.risk !== activeRisk) return false;
        if (activeObject && d.object !== activeObject) return false;
        if (fieldSearch && !d.field.toLowerCase().includes(fieldSearch.toLowerCase())) return false;
        if (activeElement !== 'all') {
            const inReaders = d.readers.some(r => r.element === activeElement);
            const inWriters = d.writers.some(w => w.element === activeElement);
            if (!inReaders && !inWriters) return false;
        }
        return true;
    });
}

function initFilters() {
    const objects = [...new Set(DATA.map(d => d.object))].sort();

    document.getElementById('subtitle').textContent =
        `${DATA.length} fields · ${objects.length} objects · ` +
        `${DATA.filter(d => d.risk === 'critical').length} critical · ` +
        `${DATA.filter(d => d.risk === 'high').length} high`;

    const objectSelect = document.getElementById('object-filter');
    objects.forEach(obj => {
        const opt = document.createElement('option');
        opt.value = obj;
        opt.textContent = obj;
        objectSelect.appendChild(opt);
    });

    objectSelect.addEventListener('change', () => { activeObject = objectSelect.value; render(); });
    document.getElementById('field-search').addEventListener('input', e => { fieldSearch = e.target.value; render(); });

    document.querySelectorAll('[data-risk]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-risk]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeRisk = btn.dataset.risk;
            render();
        });
    });

    document.querySelectorAll('[data-element]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-element]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeElement = btn.dataset.element;
            render();
        });
    });

    window.addEventListener('resize', render);
}
