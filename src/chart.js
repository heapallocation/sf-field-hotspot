const colours = {
    critical: '#dd3300',
    high:     '#bb5500',
    medium:   '#886600',
    write:    '#884444',
    read:     '#335588',
};

const container = document.getElementById('chart');

function render() {
    container.innerHTML = '';
    const data = filtered();
    if (!data.length) {
        container.innerHTML = '<p style="padding:40px;color:#555">No fields match this filter.</p>';
        return;
    }

    const W = container.clientWidth, H = container.clientHeight;
    const svg = d3.select(container).append('svg').attr('width', W).attr('height', H);

    const maxSize = d3.max(data, d => d.size) || 1;
    const r = d3.scaleSqrt().domain([1, maxSize]).range([18, Math.min(W, H) / 8]);
    const nodes = data.map(d => ({ ...d, r: r(d.size) }));

    const sim = d3.forceSimulation(nodes)
        .force('charge', d3.forceManyBody().strength(5))
        .force('center', d3.forceCenter(W / 2, H / 2))
        .force('collision', d3.forceCollide(d => d.r + 3))
        .stop();

    for (let i = 0; i < 300; i++) sim.tick();

    const g = svg.selectAll('g').data(nodes).join('g')
        .attr('transform', d => `translate(${Math.max(d.r, Math.min(W - d.r, d.x))},${Math.max(d.r, Math.min(H - d.r, d.y))})`)
        .on('click', (_, d) => showSidebar(d));

    g.append('circle')
        .attr('r', d => d.r)
        .attr('fill', d => colours[d.risk])
        .attr('fill-opacity', 0.8)
        .attr('stroke', d => colours[d.risk])
        .attr('stroke-width', 1.5);

    g.append('text')
        .attr('class', 'bubble-label')
        .attr('font-size', d => Math.max(9, Math.min(12, d.r / 3)))
        .attr('fill', '#fff')
        .text(d => d.r > 22 ? d.field : '');
}
