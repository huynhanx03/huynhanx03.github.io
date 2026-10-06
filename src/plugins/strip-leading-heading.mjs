export function stripLeadingHeading() {
  return (tree) => {
    const index = tree.children.findIndex((node) => node.type === 'heading' && node.depth === 1);
    if (index >= 0) tree.children.splice(index, 1);
  };
}
