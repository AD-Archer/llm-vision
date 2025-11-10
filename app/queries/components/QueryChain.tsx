import type { SavedQuery } from "./QueriesList";
import type { FollowUp } from "../../../types";
import type { NormalizedInsight } from "../../../utils/chartConfig";
import { QueryChainItem } from "./QueryChainItem";

interface TreeNode {
  id: string;
  type: "query" | "followup" | "parent";
  question: string;
  result: NormalizedInsight;
  name?: string;
  isFavorite: boolean;
  chartType?: string;
  createdAt: number;
  updatedAt: number;
  item: SavedQuery | FollowUp;
  children: TreeNode[];
  level: number;
}

interface QueryChainProps {
  query: SavedQuery | FollowUp;
  parentQuery: SavedQuery | null;
  selectedItem: SavedQuery | FollowUp | null;
  onSelectFollowUp: (followUp: FollowUp) => void;
  onToggleFavorite: (id: string) => void;
  onRunNewQuery?: (baseQuestion: string) => void;
  formatDate: (timestamp: number) => string;
}

export function QueryChain({
  query,
  parentQuery,
  selectedItem,
  onSelectFollowUp,
  onToggleFavorite,
  onRunNewQuery,
  formatDate,
}: QueryChainProps) {
  // Build tree structure - showing relevant context based on what's being viewed
  const buildTree = (): TreeNode[] => {
    const isViewingFollowUp = "parentQueryId" in query;

    // Helper function to convert FollowUp to TreeNode
    const followUpToNode = (
      followUp: FollowUp,
      level: number,
      type: "query" | "followup" | "parent" = "followup"
    ): TreeNode => ({
      id: followUp.id,
      type,
      question: followUp.question,
      result: followUp.result,
      name: followUp.name,
      isFavorite: followUp.isFavorite,
      chartType: followUp.chartType,
      createdAt: followUp.createdAt,
      updatedAt: followUp.updatedAt,
      item: followUp,
      children: [],
      level,
    });

    // Helper to recursively build children from nested followUps
    const buildFollowUpChildren = (
      followUp: FollowUp,
      level: number
    ): TreeNode[] => {
      if (!followUp.followUps || followUp.followUps.length === 0) {
        return [];
      }
      return followUp.followUps.map((child) => {
        const node = followUpToNode(child, level);
        node.children = buildFollowUpChildren(child, level + 1);
        return node;
      });
    };

    // If viewing a follow-up that has a parent follow-up (nested)
    if (
      isViewingFollowUp &&
      "parentFollowUpId" in query &&
      query.parentFollowUpId &&
      parentQuery
    ) {
      // Find the parent follow-up in the parent query's follow-ups
      const findParentFollowUp = (followUps: FollowUp[]): FollowUp | null => {
        for (const followUp of followUps) {
          if (followUp.id === query.parentFollowUpId) {
            return followUp;
          }
          if (followUp.followUps && followUp.followUps.length > 0) {
            const found = findParentFollowUp(followUp.followUps);
            if (found) return found;
          }
        }
        return null;
      };

      const parentFollowUp = parentQuery.followUps
        ? findParentFollowUp(parentQuery.followUps)
        : null;

      if (parentFollowUp) {
        // Show: Parent Follow-up -> Current Follow-up -> Children
        const parentNode = followUpToNode(parentFollowUp, 0, "parent");

        // Find the current query in the parent's children and build from there
        const currentNode = followUpToNode(query as FollowUp, 1, "followup");
        currentNode.children = buildFollowUpChildren(query as FollowUp, 2);

        parentNode.children = [currentNode];

        // Also add siblings of current query
        if (parentFollowUp.followUps) {
          parentFollowUp.followUps.forEach((sibling) => {
            if (sibling.id !== query.id) {
              const siblingNode = followUpToNode(sibling, 1);
              siblingNode.children = buildFollowUpChildren(sibling, 2);
              parentNode.children.push(siblingNode);
            }
          });
        }

        return flattenTree([parentNode]);
      }
    }

    // If viewing a follow-up (direct child of query) or the query itself
    if (isViewingFollowUp && parentQuery) {
      // Show: Original Query -> Follow-ups (including current one)
      const rootName = parentQuery.visualizationName;

      const rootItem: TreeNode = {
        id: parentQuery.id,
        type: "query",
        question: parentQuery.question,
        result: parentQuery.result,
        name: rootName,
        isFavorite: parentQuery.isFavorite,
        createdAt: parentQuery.createdAt,
        updatedAt: parentQuery.updatedAt,
        item: parentQuery,
        children: [],
        level: 0,
      };

      // Build children from parent query's follow-ups
      if (parentQuery.followUps) {
        rootItem.children = parentQuery.followUps.map((followUp) => {
          const node = followUpToNode(followUp, 1);
          node.children = buildFollowUpChildren(followUp, 2);
          return node;
        });
      }

      return flattenTree([rootItem]);
    }

    // Viewing a SavedQuery
    const rootQuery = query as SavedQuery;
    const rootName = rootQuery.visualizationName;

    const rootItem: TreeNode = {
      id: rootQuery.id,
      type: "query",
      question: rootQuery.question,
      result: rootQuery.result,
      name: rootName,
      isFavorite: rootQuery.isFavorite,
      createdAt: rootQuery.createdAt,
      updatedAt: rootQuery.updatedAt,
      item: rootQuery,
      children: [],
      level: 0,
    };

    // Build children from query's follow-ups
    if (rootQuery.followUps) {
      rootItem.children = rootQuery.followUps.map((followUp) => {
        const node = followUpToNode(followUp, 1);
        node.children = buildFollowUpChildren(followUp, 2);
        return node;
      });
    }

    return flattenTree([rootItem]);
  };

  // Flatten tree for rendering
  const flattenTree = (
    nodes: TreeNode[],
    result: TreeNode[] = []
  ): TreeNode[] => {
    nodes.forEach((node) => {
      result.push(node);
      if (node.children && node.children.length > 0) {
        flattenTree(node.children, result);
      }
    });
    return result;
  };

  const treeItems = buildTree();

  return (
    <div className="space-y-2">
      {treeItems.map((treeItem, index) => (
        <div
          key={treeItem.id}
          style={{ marginLeft: `${treeItem.level * 24}px` }}
          className="relative"
        >
          {/* Tree connector lines */}
          {treeItem.level > 0 && (
            <>
              <div className="absolute -left-6 top-6 w-6 h-0.5 bg-slate-600" />
              <div className="absolute -left-6 top-0 w-0.5 h-6 bg-slate-600" />
            </>
          )}

          <QueryChainItem
            chainItem={{
              id: treeItem.id,
              type: treeItem.type,
              question: treeItem.question,
              result: treeItem.result,
              name: treeItem.name,
              isFavorite: treeItem.isFavorite,
              chartType: treeItem.chartType,
              createdAt: treeItem.createdAt,
              updatedAt: treeItem.updatedAt,
              item: treeItem.item,
            }}
            index={index}
            total={treeItems.length}
            onSelect={
              treeItem.type === "followup"
                ? () => onSelectFollowUp(treeItem.item as FollowUp)
                : undefined
            }
            onToggleFavorite={() => onToggleFavorite(treeItem.id)}
            onRunNewQuery={
              onRunNewQuery ? () => onRunNewQuery(treeItem.question) : undefined
            }
            formatDate={formatDate}
            isSelected={
              selectedItem ? treeItem.item.id === selectedItem.id : false
            }
            initialExpanded={treeItem.type === "query" && treeItem.level === 0}
          />
        </div>
      ))}
    </div>
  );
}
