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
  // Build tree structure
  const buildTree = (): TreeNode[] => {
    // Determine the root of the tree
    const isViewingFollowUp = "parentQueryId" in query;

    // If viewing a follow-up and we have the parent query, use it as the root
    const rootQuery: SavedQuery | FollowUp =
      isViewingFollowUp && parentQuery ? parentQuery : query;
    const rootType: "query" | "followup" | "parent" =
      isViewingFollowUp && parentQuery ? "query" : "query";
    const rootName =
      "visualizationName" in rootQuery
        ? rootQuery.visualizationName
        : "name" in rootQuery
        ? rootQuery.name
        : undefined;

    // Add root
    const rootItem: TreeNode = {
      id: rootQuery.id,
      type: rootType,
      question: rootQuery.question,
      result: rootQuery.result,
      name: rootName,
      isFavorite: "isFavorite" in rootQuery ? rootQuery.isFavorite : false,
      chartType: "chartType" in rootQuery ? rootQuery.chartType : undefined,
      createdAt: rootQuery.createdAt,
      updatedAt: rootQuery.updatedAt,
      item: rootQuery,
      children: [],
      level: 0,
    };

    // Group follow-ups by parent
    const followUpsByParent: Record<string, FollowUp[]> = {};

    // Get all follow-ups from the root query
    const allFollowUps =
      "followUps" in rootQuery ? rootQuery.followUps || [] : [];

    allFollowUps.forEach((followUp: FollowUp) => {
      const parentId = followUp.parentFollowUpId || followUp.parentQueryId;
      if (!followUpsByParent[parentId]) {
        followUpsByParent[parentId] = [];
      }
      followUpsByParent[parentId].push(followUp);
    });

    // Recursive function to build tree
    const buildChildren = (parentId: string, level: number): TreeNode[] => {
      const children = followUpsByParent[parentId] || [];
      return children
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(
          (followUp): TreeNode => ({
            id: followUp.id,
            type: "followup",
            question: followUp.question,
            result: followUp.result,
            name: followUp.name,
            isFavorite: followUp.isFavorite,
            chartType: followUp.chartType,
            createdAt: followUp.createdAt,
            updatedAt: followUp.updatedAt,
            item: followUp,
            children: buildChildren(followUp.id, level + 1),
            level,
          })
        );
    };

    rootItem.children = buildChildren(rootQuery.id, 1);

    // Flatten for rendering with level information
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

    return flattenTree([rootItem]);
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
