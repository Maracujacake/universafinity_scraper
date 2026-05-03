export function rescaleGraphPositions(graph, paddingRatio = 0.12) {
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
  const largestDimension = Math.max(width, height) || 1;
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;
  const safePadding = Math.min(Math.max(paddingRatio, 0), 0.45);
  const scale = 1 - safePadding;

  nodes.forEach(node => {
    const { x, y } = graph.getNodeAttributes(node);
    const newX = ((x - centerX) / largestDimension) * scale;
    const newY = ((y - centerY) / largestDimension) * scale;
    graph.setNodeAttribute(node, 'x', newX);
    graph.setNodeAttribute(node, 'y', newY);
  });
}
