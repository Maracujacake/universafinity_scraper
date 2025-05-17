export function rescaleGraphPositions(graph, padding = 100) {
  const nodes = graph.nodes();
  if (nodes.length === 0) return;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  nodes.forEach(node => {
    const { x, y } = graph.getNodeAttributes(node);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  const width = maxX - minX || 1;  
  const height = maxY - minY || 1;

  console.log('width:', width, 'height:', height);

  nodes.forEach(node => {
    const { x, y } = graph.getNodeAttributes(node);
    const newX = (padding + ((x - minX) / width) * width) / 500;
    const newY = (padding + ((y - minY) / height) * height) / 500;
    graph.setNodeAttribute(node, 'x', newX);
    graph.setNodeAttribute(node, 'y', newY);
  });
}
